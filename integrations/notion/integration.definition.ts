/* bplint-disable */
import { IntegrationDefinition, z } from '@botpress/sdk'
import listable from 'bp_modules/listable'
import { NotionEntities } from 'src/notion'

export default new IntegrationDefinition({
  name: 'notion-better',
  description: 'Add pages and comments, manage databases, and engage in discussions — all within your chatbot.',
  title: 'Notion',
  version: '0.3.5',
  icon: 'icon.svg',
  readme: 'hub.md',
  configuration: {
    identifier: {
      linkTemplateScript: 'linkTemplate.vrl',
    },
    schema: z.object({}),
  },
  user: { tags: { id: {} } },
  secrets: {
    CLIENT_ID: {
      description: 'The client ID of  Botpress Notion Integration.',
    },
    CLIENT_SECRET: {
      description: 'The client secret of Botpress Notion Integration.',
    },
    REDIRECT_URI: {
      description: 'The verify token of Botpress Notion Integration.',
    },
  },
  states: {
    oauth: {
      type: 'integration',
      schema: NotionEntities.AuthTokenResponse,
    },
  },
  actions: {
    addCommentToPage: {
      input: {
        schema: z.object({
          pageId: z.string().min(1),
          commentBody: z.string().min(1),
        }),
      },
      output: {
        schema: z.object({}),
      },
    },
    addCommentToDiscussion: {
      input: {
        schema: z.object({
          discussionId: z.string().min(1),
          commentBody: z.string().min(1),
        }),
      },
      output: {
        schema: z.object({}),
      },
    },
    getConnectedWorkspace: {
      input: {
        schema: z.object({}),
      },
      output: {
        schema: NotionEntities.AuthTokenResponse.pick({
          workspace_icon: true,
          workspace_id: true,
          workspace_name: true,
          owner: true,
        }),
      },
    },
    createFilesFromPages: {
      input: {
        schema: z
          .object({
            pages: z.array(
              z.object({
                id: z.string().describe('The ID of the Notion page to be uploaded to a botpress file'),
                // We don't want to validate this because that's file API's job
                fileProps: z
                  .object({})
                  .passthrough()
                  .describe(
                    'File size will be overriden with the actual size of the page. Refer to https://botpress.com/reference/upsertfile'
                  ),
              })
            ),
          })
          .describe('Converts Notion pages to Botpress files'),
      },
      output: {
        schema: z.object({
          files: z.array(
            z.object({
              id: z.string(),
            })
          ),
        }),
      },
    },
  },
  entities: {
    page: {
      title: 'Page',
      description: 'A notion page',
      schema: NotionEntities.Page,
    },
  },
}).extend(listable, ({ entities }) => ({
  entities: { item: entities.page },
  actions: {
    list: { name: 'listPages' },
  },
}))
