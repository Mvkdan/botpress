import * as common from '@botpress/common'
import * as path from 'path'

const { runCommand } = common.cmd
const creatablePath = path.resolve(path.join('..', '..', 'interfaces', 'creatable'))
runCommand(`bp add ${creatablePath} -y`, { workDir: __dirname })
