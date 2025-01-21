import esbuild from 'esbuild'

import { dependencies } from './package.json'

const external = Object.keys(dependencies)

const common: esbuild.BuildOptions = {
  bundle: true,
  minify: true,
  sourcemap: true,
}

const buildNode = () =>
  esbuild.build({
    ...common,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist/index.cjs',
    entryPoints: ['src/index.ts'],
    external,
  })

const buildBrowser = () =>
  esbuild.build({
    ...common,
    platform: 'browser',
    format: 'esm',
    outfile: 'dist/index.mjs',
    entryPoints: ['src/index.ts'],
    external: [...external, 'node:http'],
  })

const main = async (argv: string[]) => {
  if (argv.includes('--node')) {
    return buildNode()
  }

  if (argv.includes('--browser')) {
    return buildBrowser()
  }

  throw new Error('Please specify --node or --browser')
}

void main(process.argv.slice(2))
  .then(() => {
    console.info('Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
