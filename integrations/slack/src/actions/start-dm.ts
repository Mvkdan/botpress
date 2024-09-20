import { WebClient } from '@slack/web-api'
import { getAccessToken } from '../misc/utils'
import * as bp from '.botpress'

export const startDmConversation: bp.IntegrationProps['actions']['startDmConversation'] = async ({
  ctx,
  client,
  input,
}) => {
  const accessToken = await getAccessToken(client, ctx)
  const slackClient = new WebClient(accessToken)

  const { user } = await client.getOrCreateUser({
    tags: {
      id: input.slackUserId,
    },
  })

  if (user.tags.dm_conversation_id) {
    return {
      conversationId: user.tags.dm_conversation_id,
      userId: user.id,
    }
  }

  const { ok, channel } = await slackClient.conversations.open({
    users: input.slackUserId,
  })

  if (!ok || !channel) {
    throw new Error('Could not open conversation')
  }

  const { conversation } = await client.getOrCreateConversation({
    channel: 'dm',
    tags: {
      id: channel.id,
    },
  })

  await client.updateConversation({
    id: conversation.id,
    tags: {
      title: `DM with ${user.name}`,
      id: channel.id,
    },
  })

  await client.updateUser({
    id: user.id,
    tags: {
      dm_conversation_id: conversation.id,
      id: input.slackUserId,
    },
  })

  return {
    conversationId: conversation.id,
    userId: user.id,
  }
}
