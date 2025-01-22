import * as sdk from '@botpress/sdk'

export const states = {
  oAuthConfig: {
    type: 'integration',
    schema: sdk.z.object({
      refreshToken: sdk.z
        .string()
        .title('Refresh token')
        .describe('The refresh token to use to authenticate with Google APIs. It gets exchanged for a bearer token'),
    }),
  },
} as const satisfies sdk.IntegrationDefinitionProps['states']
