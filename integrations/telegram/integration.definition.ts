import { z, IntegrationDefinition, messages, interfaces, InterfacePackage } from '@botpress/sdk'
import { sentry as sentryHelpers } from '@botpress/sdk-addons'

const typingIndicatorPkg = {
  type: 'interface',
  definition: interfaces.typingIndicator,
} satisfies InterfacePackage

export default new IntegrationDefinition({
  name: 'telegram',
  version: '0.5.2',
  title: 'Telegram',
  description: 'This integration allows your bot to interact with Telegram.',
  icon: 'icon.svg',
  readme: 'hub.md',
  configuration: {
    schema: z.object({
      botToken: z.string().min(1),
    }),
  },
  channels: {
    channel: {
      messages: messages.defaults,
      message: { tags: { id: {}, chatId: {} } },
      conversation: {
        tags: { id: {}, fromUserId: {}, fromUserName: {}, chatId: {} },
        creation: { enabled: true, requiredTags: ['id'] },
      },
    },
  },
  actions: {},
  events: {},
  secrets: sentryHelpers.COMMON_SECRET_NAMES,
  user: {
    tags: {
      id: {},
    },
    creation: { enabled: true, requiredTags: ['id'] },
  },
}).extend(typingIndicatorPkg, () => ({}))
