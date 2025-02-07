// This file is generated. Do not edit it manually.
// See 'scripts/update-models.ts'

/* eslint-disable */
/* tslint:disable */

export namespace llm {
  export namespace generateContent {
    export type Input = {
      /** Model to use for content generation */
      model?: { id: string }
      /** Optional system prompt to guide the model */
      systemPrompt?: string
      /** Array of messages for the model to process */
      messages: Array<{
        role: 'user' | 'assistant'
        type?: 'text' | 'tool_calls' | 'tool_result' | 'multipart'
        /** Required if `type` is "tool_calls" */
        toolCalls?: Array<{
          id: string
          type: 'function'
          function: {
            name: string
            /** Some LLMs may generate invalid JSON for a tool call, so this will be `null` when it happens. */
            arguments: { [key: string]: any } | null
          }
        }>
        /** Required if `type` is "tool_result" */
        toolResultCallId?: string
        /** Required unless `type` is "tool_call". If `type` is "multipart", this field must be an array of content objects. If `type` is "tool_result" then this field should be the result of the tool call (a plain string or a JSON-encoded array or object). If `type` is "tool_call" then the `toolCalls` field should be used instead. */
        content:
          | string
          | Array<{
              type: 'text' | 'image'
              /** Indicates the MIME type of the content. If not provided it will be detected from the content-type header of the provided URL. */
              mimeType?: string
              /** Required if part type is "text" */
              text?: string
              /** Required if part type is "image" */
              url?: string
            }>
          | null
      }>
      /** Response format expected from the model. If "json_object" is chosen, you must instruct the model to generate JSON either via the system prompt or a user message. */
      responseFormat?: 'text' | 'json_object'
      /** Maximum number of tokens allowed in the generated response */
      maxTokens?: number
      /** Sampling temperature for the model. Higher values result in more random outputs. */
      temperature?: /** Sampling temperature for the model. Higher values result in more random outputs. */ number
      /** Top-p sampling parameter. Limits sampling to the smallest set of tokens with a cumulative probability above the threshold. */
      topP?: /** Top-p sampling parameter. Limits sampling to the smallest set of tokens with a cumulative probability above the threshold. */ number
      /** Sequences where the model should stop generating further tokens. */
      stopSequences?: string[]
      tools?: Array<{
        type: 'function'
        function: {
          /** Function name */
          name: string
          description?: string
          /** JSON schema of the function arguments */
          argumentsSchema?: {}
        }
      }>
      toolChoice?: {
        type?: 'auto' | 'specific' | 'any' | 'none' | ''
        /** Required if `type` is "specific" */
        functionName?: string
      }
      userId?: string
      /** Set to `true` to output debug information to the bot logs */
      debug?: boolean
      meta?: {
        /** Source of the prompt, e.g. agent/:id/:version cards/ai-generate, cards/ai-task, nodes/autonomous, etc. */
        promptSource?: string
        promptCategory?: string
        /** Name of the integration that originally received the message that initiated this action */
        integrationName?: string
      }
    }
    export type Output = {
      /** Response ID from LLM provider */
      id: string
      /** LLM provider name */
      provider: string
      /** Model name */
      model: string
      choices: Array<{
        type?: 'text' | 'tool_calls' | 'tool_result' | 'multipart'
        /** Required if `type` is "tool_calls" */
        toolCalls?: Array<{
          id: string
          type: 'function'
          function: {
            name: string
            /** Some LLMs may generate invalid JSON for a tool call, so this will be `null` when it happens. */
            arguments: { [key: string]: any } | null
          }
        }>
        /** Required if `type` is "tool_result" */
        toolResultCallId?: string
        /** Required unless `type` is "tool_call". If `type` is "multipart", this field must be an array of content objects. If `type` is "tool_result" then this field should be the result of the tool call (a plain string or a JSON-encoded array or object). If `type` is "tool_call" then the `toolCalls` field should be used instead. */
        content:
          | string
          | Array<{
              type: 'text' | 'image'
              /** Indicates the MIME type of the content. If not provided it will be detected from the content-type header of the provided URL. */
              mimeType?: string
              /** Required if part type is "text" */
              text?: string
              /** Required if part type is "image" */
              url?: string
            }>
          | null
        role: 'assistant'
        index: number
        stopReason: 'stop' | 'max_tokens' | 'tool_calls' | 'content_filter' | 'other'
      }>
      usage: {
        /** Number of input tokens used by the model */
        inputTokens: number
        /** Cost of the input tokens received by the model, in U.S. dollars */
        inputCost: number
        /** Number of output tokens used by the model */
        outputTokens: number
        /** Cost of the output tokens generated by the model, in U.S. dollars */
        outputCost: number
      }
      botpress: {
        /** Total cost of the content generation, in U.S. dollars */
        cost: number
      }
    }
  }
}
