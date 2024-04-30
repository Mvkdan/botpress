import { z } from '@botpress/sdk'
import type { IntegrationDefinitionProps } from '@botpress/sdk'

export const states = {
  freshchat: {
    type: 'integration',
    schema: z.object({ botpressConversationId: z.string(), botpressConversationId: z.string() }),
  }
} satisfies IntegrationDefinitionProps['states']
