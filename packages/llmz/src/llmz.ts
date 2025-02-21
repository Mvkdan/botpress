import { Cognitive, type BotpressClientLike } from '@botpress/cognitive'
import { z } from '@bpinternal/zui'

import { omit, clamp, isEqual, isPlainObject } from 'lodash-es'
import ms from 'ms'

import { Context, Iteration } from './context.js'
import {
  AssignmentError,
  CodeExecutionError,
  ExecuteSignal,
  InvalidCodeError,
  Signals,
  ThinkSignal,
  VMInterruptSignal,
  VMSignal,
} from './errors.js'
import { Exit } from './exit.js'
import { ValueOrGetter } from './getter.js'

import { type ObjectInstance } from './objects.js'

import { type Tool } from './tool.js'

import { TranscriptMessage } from './transcript.js'
import { truncateWrappedContent } from './truncator.js'
import { ExecutionResult, Trace } from './types.js'
import { init, stripInvalidIdentifiers } from './utils.js'
import { runAsyncFunction } from './vm.js'

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : JSON.stringify(err))

const SLOW_TOOL_WARNING = ms('15s')

const RESPONSE_LENGTH_BUFFER = {
  MIN_TOKENS: 1_000,
  MAX_TOKENS: 16_000,
  PERCENTAGE: 0.1,
} as const

const getModelOutputLimit = (inputLength: number) =>
  clamp(
    RESPONSE_LENGTH_BUFFER.PERCENTAGE * inputLength,
    RESPONSE_LENGTH_BUFFER.MIN_TOKENS,
    RESPONSE_LENGTH_BUFFER.MAX_TOKENS
  )

export type ExecutionHooks = {
  /**
   * Called after each iteration ends
   *
   * **Warning**: This should not be a long task as it blocks the execution
   */
  onIterationEnd?: (iteration: Iteration) => Promise<void> | void
  onTrace?: (event: { trace: Trace; iteration: number }) => void

  // TODO: canLoop?(iteration: Iteration): boolean
  // TODO: canExit?(iteration: Iteration): boolean

  // TODO: validateExit?(exit: Exit, value: unknown): Promise<boolean>
  onExit?: (exit: Exit, value: unknown) => Promise<void> | void
}

type Options = Partial<Pick<Context, 'loop' | 'temperature' | 'model'>>

export type ExecutionProps = {
  instructions?: ValueOrGetter<string, Context>
  objects?: ValueOrGetter<ObjectInstance[], Context>
  tools?: ValueOrGetter<Tool[], Context>
  exits?: ValueOrGetter<Exit[], Context>
  transcript?: ValueOrGetter<TranscriptMessage[], Context>
  options?: Options
  /** An instance of a Botpress Client, or an instance of Cognitive Client (@botpress/cognitive) */
  client: Cognitive | BotpressClientLike
  signal?: AbortController['signal']
} & ExecutionHooks

const executeContext = async (props: ExecutionProps): Promise<ExecutionResult> => {
  await init()

  const { signal, onIterationEnd, onTrace, onExit } = props
  const cognitive = props.client instanceof Cognitive ? props.client : new Cognitive({ client: props.client })
  const cleanups: (() => void)[] = []

  const ctx = new Context({
    instructions: props.instructions,
    objects: props.objects,
    tools: props.tools,
    loop: props.options?.loop,
    temperature: props.options?.temperature,
    model: props.options?.model,
    transcript: props.transcript,
    exits: props.exits,
  })

  try {
    while (true) {
      if (ctx.iterations.length >= ctx.loop) {
        return {
          status: 'error',
          context: ctx,
          error: `Loop limit exceeded. Maximum allowed loops: ${ctx.loop}`,
          iterations: ctx.iterations,
        }
      }

      const iteration = await ctx.nextIteration()

      cleanups.push(
        iteration.traces.onPush((traces) => {
          // TODO: unsubscribe after the iteration ends
          for (const trace of traces) {
            onTrace?.({ trace, iteration: ctx.iterations.length })
          }
        })
      )

      try {
        await executeIteration({
          iteration,
          ctx,
          cognitive,
          abortSignal: signal,
          onExit,
        })
      } catch (err) {
        // this should not happen, but if it does, we want to catch it and mark the iteration as failed and loop
        iteration.end({
          type: 'execution_error',
          execution_error: {
            stack: (err as Error).stack ?? 'No stack trace available',
            message: 'An unexpected error occurred: ' + getErrorMessage(err),
          },
        })
      }

      try {
        await onIterationEnd?.(iteration)
      } catch (err) {
        console.error(err)
      }

      // Successful states
      if (iteration.status.type === 'exit_success') {
        return {
          status: 'success',
          context: ctx,
          iterations: ctx.iterations,
        }
      }

      if (iteration.status.type === 'callback_requested') {
        throw new Error('Callbacks are not yet implemented')
        // TODO: implement snapshots
        // return {
        //   status: 'interrupted',
        //   snapshot: createSnapshot({} as any) as any, // TODO: fixme
        //   context: ctx,
        //   iterations: ctx.iterations,
        //   signal: {} as any, // TODO: fixme
        // }
      }

      // Retryable errors
      if (
        iteration.status.type === 'thinking_requested' ||
        iteration.status.type === 'exit_error' ||
        iteration.status.type === 'execution_error' ||
        iteration.status.type === 'invalid_code_error'
      ) {
        continue
      }

      // Fatal errors
      return {
        context: ctx,
        error: iteration.error ?? `Unknown error. Status: ${iteration.status.type}`,
        status: 'error',
        iterations: ctx.iterations,
      }
    }
  } catch (error) {
    return {
      status: 'error',
      iterations: ctx.iterations,
      context: ctx,
      error: error instanceof Error ? error.message : (error?.toString() ?? 'Unknown error'),
    }
  } finally {
    for (const cleanup of cleanups) {
      try {
        cleanup()
      } catch {}
    }
  }
}

const executeIteration = async ({
  iteration,
  ctx,
  cognitive,
  abortSignal,
  onExit,
}: {
  ctx: Context
  iteration: Iteration
  cognitive: Cognitive
  abortSignal?: AbortController['signal']
} & ExecutionHooks): Promise<void> => {
  // TODO: expose "getTokenLimits()"

  let startedAt = Date.now()
  const traces = iteration.traces
  const modelLimit = 128_000 // ctx.__options.model // TODO: fixme
  const responseLengthBuffer = getModelOutputLimit(modelLimit)

  const messages = truncateWrappedContent({
    messages: iteration.messages,
    tokenLimit: modelLimit - responseLengthBuffer,
    throwOnFailure: false,
  }).filter(
    (x) =>
      // Filter out empty messages, as they are not valid inputs for the LLM
      // This can happen when a message is truncated and the content is empty
      x.content.trim().length > 0
  )

  const output = await cognitive.generateContent({
    signal: abortSignal,
    systemPrompt: messages.find((x) => x.role === 'system')?.content,
    model: ctx.model as any | undefined,
    temperature: ctx.temperature,
    responseFormat: 'text',
    messages: messages
      .filter((x) => x.role === 'user' || x.role === 'assistant')
      .map(
        (x) =>
          ({
            role: x.role === 'user' ? 'user' : 'assistant',
            type: 'text',
            content: x.content,
          }) as const
      ),
    stopSequences: ctx.version.getStopTokens(),
  }) // TODO: handle errors here and mark iteration as failed for this reason

  const out =
    output.output.choices?.[0]?.type === 'text' && typeof output.output.choices?.[0].content === 'string'
      ? output.output.choices[0].content
      : null

  // TODO: do better handling of the different types of errors and potentially retry the request

  if (!out) {
    throw new Error('No output from LLM')
  }

  const assistantResponse = ctx.version.parseAssistantResponse(out)

  iteration.code = assistantResponse.code.trim()

  iteration.llm = {
    cached: output.meta.cached || false,
    ended_at: Date.now(),
    started_at: startedAt,
    status: 'success',
    tokens: output.meta.tokens.input + output.meta.tokens.output,
    spend: output.meta.cost.input + output.meta.cost.output,
    output: assistantResponse.raw,
    model: `${output.meta.model.integration}:${output.meta.model.model}`,
  }

  traces.push({
    type: 'llm_call',
    started_at: startedAt,
    ended_at: iteration.llm.ended_at,
    status: 'success',
    model: ctx.model ?? '',
  })

  const vmContext = { ...stripInvalidIdentifiers(iteration.variables) }

  for (const obj of iteration.objects) {
    const internalValues: Record<string, string> = {}
    const instance: Record<string, any> = {}

    for (const { name, value, writable, type } of obj.properties ?? []) {
      internalValues[name] = value

      const initialValue = value
      const schema = type ?? z.any()

      Object.defineProperty(instance, name, {
        enumerable: true,
        configurable: true,
        get() {
          return internalValues[name]
        },
        set(value) {
          if (isEqual(value, internalValues[name])) {
            return
          }

          if (!writable) {
            throw new AssignmentError(`Property ${obj.name}.${name} is read-only and cannot be modified`)
          }

          if (value === internalValues[name]) {
            return
          }

          const parsed = schema.safeParse(value)

          if (!parsed.success) {
            throw new AssignmentError(
              `Invalid value for Object property ${obj.name}.${name}: ${getErrorMessage(parsed.error)}`
            )
          }

          internalValues[name] = parsed.data

          traces.push({
            type: 'property',
            started_at: Date.now(),
            object: obj.name,
            property: name,
            value: parsed.data,
          })

          iteration.trackMutation({ object: obj.name, property: name, before: initialValue, after: parsed.data })
        },
      })
    }

    for (const tool of obj.tools ?? []) {
      instance[tool.name] = wrapTool({ tool, traces, object: obj.name })
    }

    Object.preventExtensions(instance)
    Object.seal(instance)

    vmContext[obj.name] = instance
  }

  for (const tool of iteration.tools) {
    const wrapped = wrapTool({ tool, traces })
    for (const key of [tool.name, ...(tool.aliases ?? [])]) {
      vmContext[key] = wrapped
    }
  }

  if (abortSignal?.aborted) {
    traces.push({
      type: 'abort_signal',
      started_at: Date.now(),
      reason: 'The operation was aborted by user.',
    })
    // TODO: handle abortions better.. there's more than one path possible

    return iteration.end({
      type: 'aborted',
      aborted: {
        reason: abortSignal?.reason ?? 'The operation was aborted',
      },
    })
  }

  type Result = Awaited<ReturnType<typeof runAsyncFunction>>

  startedAt = Date.now()
  const result: Result = await runAsyncFunction(vmContext, assistantResponse.code.trim(), traces, abortSignal).catch(
    (err) => {
      return {
        success: false,
        error: err as Error,
        lines_executed: [],
        traces: [],
        variables: {},
      } satisfies Result
    }
  )

  if (result.error && result.error instanceof InvalidCodeError) {
    return iteration.end({
      type: 'invalid_code_error',
      invalid_code_error: {
        message: result.error.message,
      },
    })
  }

  traces.push({
    type: 'code_execution',
    lines_executed: result.lines_executed ?? 0,
    started_at: startedAt,
    ended_at: Date.now(),
  })

  if (result.error && result.error instanceof CodeExecutionError) {
    return iteration.end({
      type: 'execution_error',
      execution_error: {
        message: result.error.message,
        stack: result.error.stack ?? 'No stack trace available',
      },
    })
  }

  if (abortSignal?.aborted) {
    return iteration.end({
      type: 'aborted',
      aborted: {
        reason: abortSignal?.reason ?? 'The operation was aborted',
      },
    })
  }

  if (!result.success) {
    return iteration.end({
      type: 'execution_error',
      execution_error: {
        message: result?.error?.message ?? 'Unknown error occurred',
        stack: result.error.stack ?? 'No stack trace available',
      },
    })
  }

  if (result.signal instanceof ThinkSignal) {
    return iteration.end({
      type: 'thinking_requested',
      thinking_requested: {
        variables: result.signal.variables,
        reason: result.signal.reason,
      },
    })
  }

  if (result.signal instanceof VMInterruptSignal) {
    return iteration.end({
      type: 'callback_requested',
      callback_requested: {
        reason: result.signal.message,
        stack: result.signal.truncatedCode,
      },
    })
  }

  const validActions = [...iteration.exits.map((x) => x.name.toLowerCase()), 'think']
  let returnValue: { action: string; value?: unknown } | null =
    result.success && result.return_value ? result.return_value : null

  const returnAction = returnValue?.action
  const returnExit =
    iteration.exits.find((x) => x.name.toLowerCase() === returnAction?.toLowerCase()) ??
    iteration.exits.find((x) => x.aliases.some((a) => a.toLowerCase() === returnAction?.toLowerCase()))

  if (returnAction === 'think') {
    const variables = omit(returnValue ?? {}, 'action')
    if (isPlainObject(variables) && Object.keys(variables).length > 0) {
      return iteration.end({
        type: 'thinking_requested',
        thinking_requested: {
          variables,
          reason: 'Thinking requested',
        },
      })
    }

    return iteration.end({
      type: 'thinking_requested',
      thinking_requested: {
        reason: 'Thinking requested',
        variables: iteration.variables,
      },
    })
  }

  if (!returnAction) {
    return iteration.end({
      type: 'exit_error',
      exit_error: {
        exit: 'n/a',
        message: `Code did not return an action. Valid actions are: ${validActions.join(', ')}`,
        return_value: returnValue,
      },
    })
  }

  if (!returnExit) {
    return iteration.end({
      type: 'exit_error',
      exit_error: {
        exit: returnAction,
        message: `Exit "${returnAction}" not found. Valid actions are: ${validActions.join(', ')}`,
        return_value: returnValue,
      },
    })
  }

  if (returnExit.zSchema) {
    const parsed = returnExit.zSchema.safeParse(returnValue?.value)
    if (!parsed.success) {
      return iteration.end({
        type: 'exit_error',
        exit_error: {
          exit: returnExit.name,
          message: `Invalid return value for exit ${returnExit.name}: ${getErrorMessage(parsed.error)}`,
          return_value: returnValue,
        },
      })
    }
    returnValue = { action: returnExit.name, value: parsed.data }
  }

  try {
    await onExit?.(returnExit, returnValue?.value)
  } catch (err) {
    return iteration.end({
      type: 'exit_error',
      exit_error: {
        exit: returnExit.name,
        message: `Error executing exit ${returnExit.name}: ${getErrorMessage(err)}`,
        return_value: returnValue,
      },
    })
  }

  return iteration.end({
    type: 'exit_success',
    exit_success: {
      exit_name: returnExit.name,
      return_value: returnValue?.value,
    },
  })
}

type Props = {
  tool: Tool
  object?: string
  traces: Trace[]
}

function wrapTool({ tool, traces, object }: Props) {
  const getToolInput = (input: any) => tool.zInput.safeParse(input).data ?? input

  return function (input: any) {
    const alertSlowTool = setTimeout(
      () =>
        traces.push({
          type: 'tool_slow',
          tool_name: tool.name,
          started_at: Date.now(),
          input: getToolInput(input),
          object,
          duration: SLOW_TOOL_WARNING,
        }),
      SLOW_TOOL_WARNING
    )
    const cancelSlowTool = () => clearTimeout(alertSlowTool)

    const toolStart = Date.now()
    let output: any
    let error: any
    let success = true

    const handleSignals = (error: any) => {
      if (output === error) {
        return true
      }

      if (error instanceof VMInterruptSignal) {
        error.toolCall = {
          name: tool.name,
          inputSchema: tool.input,
          outputSchema: tool.output,
          input,
        }
        error.message = Signals.serializeError(error)
      }

      if (error instanceof ThinkSignal) {
        traces.push({
          type: 'think_signal',
          started_at: Date.now(),
          line: 0,
          ended_at: Date.now(),
        })
        success = true
        output = error
        return true
      }

      if (error instanceof ExecuteSignal) {
        traces.push({
          type: 'execute_signal',
          started_at: Date.now(),
          line: 0,
          ended_at: Date.now(),
        })

        success = true
        output = error
        return true
      }

      return false
    }

    try {
      const result = tool.execute(input)
      if (result instanceof Promise || ((result as any)?.then && (result as any)?.catch)) {
        return result
          .then((res: any) => {
            output = res
            success = true
            return res
          })
          .catch((err: any) => {
            if (!handleSignals(err)) {
              success = false
              error = err
            }

            // Important: we want to re-throw signals so that the VM can handle them
            throw err
          })
          .finally(() => {
            cancelSlowTool()
            traces.push({
              type: 'tool_call',
              started_at: toolStart,
              ended_at: Date.now(),
              tool_name: tool.name,
              object,
              input: getToolInput(input),
              output,
              error,
              success,
            })
          })
      }

      success = true
      output = result
    } catch (err) {
      if (!handleSignals(err)) {
        success = false
        error = err
      }
    }

    cancelSlowTool()
    traces.push({
      type: 'tool_call',
      started_at: toolStart,
      ended_at: Date.now(),
      tool_name: tool.name,
      object,
      input: getToolInput(input),
      output,
      error,
      success,
    })

    if (!success) {
      throw error
    }

    if (output instanceof VMSignal) {
      // Important: we want to re-throw signals so that the VM can handle them
      throw output
    }

    return output
  }
}

export const llmz = {
  executeContext,
}
