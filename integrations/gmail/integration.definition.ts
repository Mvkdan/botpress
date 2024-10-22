import * as sdk from '@botpress/sdk'
import {
  configuration,
  configurations,
  identifier,
  channels,
  user,
  states,
  actions,
  events,
  secrets,
} from './definitions'

export default new sdk.IntegrationDefinition({
  name: 'gmail',
  version: '0.4.9',
  title: 'Gmail',
  description: 'This integration allows your bot to interact with Gmail.',
  icon: 'icon.svg',
  readme: 'hub.md',
  configuration,
  configurations,
  identifier,
  channels,
  user,
  actions,
  events,
  states,
  secrets,
})
