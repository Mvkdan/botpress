import * as common from '@botpress/common'
import * as path from 'path'

const { runCommand } = common.cmd
const interfaceNames = ['llm', 'speech-to-text', 'text-to-image']

for (const interfaceName of interfaceNames) {
  const interfacePath = path.resolve(path.join('..', '..', 'interfaces', interfaceName))
  runCommand(`bp add ${interfacePath} -y`, { workDir: __dirname })
}
