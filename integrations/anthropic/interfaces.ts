import * as common from '@botpress/common'
import * as path from 'path'

const { runCommand } = common.cmd
const llmPath = path.resolve(path.join('..', '..', 'interfaces', 'llm'))
runCommand(`bp add ${llmPath} -y`, { workDir: __dirname })
