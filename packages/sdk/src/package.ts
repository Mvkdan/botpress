import * as integration from './integration'
import * as intrface from './interface'
import * as plugin from './plugin'
import * as utils from './utils'

type PackageReference =
  | {
      id: string // package installed from the botpress api
    }
  | {
      uri?: string // package installed locally or from npm
    }

type PackageDefinitionReference = {
  name: string
  version: string
}

type IntegrationPackageDefinition = PackageDefinitionReference & {
  configuration?: integration.ConfigurationDefinition
  configurations?: Record<string, integration.AdditionalConfigurationDefinition>
  events?: Record<string, integration.EventDefinition>
  actions?: Record<string, integration.ActionDefinition>
  channels?: Record<string, integration.ChannelDefinition>
  states?: Record<string, integration.StateDefinition>
  user?: integration.UserDefinition
  secrets?: Record<string, integration.SecretDefinition>
  entities?: Record<string, integration.EntityDefinition>
  interfaces?: Record<string, { definition: PackageDefinitionReference }>
}

type InterfacePackageDefinition = PackageDefinitionReference & {
  templateName?: string
  entities?: Record<string, integration.EntityDefinition>
  events?: Record<string, integration.EventDefinition>
  actions?: Record<string, integration.ActionDefinition>
  channels?: Record<string, integration.ChannelDefinition>
}

type PluginPackageDefinition = PackageDefinitionReference & {
  integrations?: Record<string, { definition: PackageDefinitionReference }>
  interfaces?: Record<string, { definition: PackageDefinitionReference }>
  user?: plugin.UserDefinition
  conversation?: plugin.ConversationDefinition
  message?: plugin.MessageDefinition
  states?: Record<string, plugin.StateDefinition>
  configuration?: plugin.ConfigurationDefinition
  events?: Record<string, plugin.EventDefinition>
  recurringEvents?: Record<string, plugin.RecurringEventDefinition>
  actions?: Record<string, plugin.ActionDefinition>
}

export type IntegrationPackage = PackageReference & {
  type: 'integration'
  definition: IntegrationPackageDefinition
  implementation?: null
}

export type InterfacePackage = PackageReference & {
  type: 'interface'
  definition: InterfacePackageDefinition
  implementation?: null
}

export type PluginPackage = PackageReference & {
  type: 'plugin'
  definition: PluginPackageDefinition
  implementation: Buffer
}

export type Package = IntegrationPackage | InterfacePackage | PluginPackage

type _test_expect_integration_definition_to_be_valid_package = utils.types.AssertExtends<
  integration.IntegrationDefinition,
  IntegrationPackageDefinition
>

type _test_expect_interface_definition_to_be_valid_package = utils.types.AssertExtends<
  intrface.InterfaceDeclaration,
  InterfacePackageDefinition
>

type _test_expect_plugin_definition_to_be_valid_package = utils.types.AssertExtends<
  plugin.PluginDefinition,
  PluginPackageDefinition
>
