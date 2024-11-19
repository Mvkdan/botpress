import { test } from 'vitest'
import * as client from '@botpress/client'
import * as utils from '../../utils/type-utils'
import * as common from '../types'
import * as types from './types'
import { FooBarBazBot, EmptyBot } from '../../fixtures'

test('MessageRequest with implemented bot should be strict type', () => {
  type Actual = types.IncomingMessage<FooBarBazBot>
  type MessageFoo = utils.Merge<client.Message, { type: 'messageFoo'; payload: { foo: string } }>
  type MessageBar = utils.Merge<client.Message, { type: 'messageBar'; payload: { bar: number } }>
  type MessageBaz = utils.Merge<client.Message, { type: 'messageBaz'; payload: { baz: boolean } }>
  type Expected = MessageFoo | MessageBar | MessageBaz
  type _assertion = utils.AssertAll<
    [
      utils.AssertExtends<Actual, Expected>,
      utils.AssertExtends<Expected, Actual>,
      utils.AssertTrue<utils.IsEqual<Actual, Expected>>
    ]
  >
})

test('MessageRequest with empty bot should be never', () => {
  type Actual = types.IncomingMessage<EmptyBot>
  type Expected = never // TODO: should be Merge<client.Message, { type: never; payload: never }>
  type _assertion = utils.AssertAll<
    [
      utils.AssertExtends<Actual, Expected>,
      utils.AssertExtends<Expected, Actual>,
      utils.AssertTrue<utils.IsEqual<Actual, Expected>>
    ]
  >
})

test('MessageRequest with base bot should be any record', () => {
  type Actual = types.IncomingMessage<common.BaseBot>
  type Expected = utils.Merge<client.Message, { type: string; payload: any }> // TODO: should be { message: Record<string, any> }
  type _assertion = utils.AssertAll<
    [
      utils.AssertExtends<Actual, Expected>,
      utils.AssertExtends<Expected, Actual>,
      utils.AssertTrue<utils.IsEqual<Actual, Expected>>
    ]
  >
})
