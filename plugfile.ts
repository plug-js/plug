import { pipe, task } from './src'

const typescript: any = null
const eslint: any = null
const mocha: any = null

const sources = task('Read source code', () =>
  pipe()
      .from('src')
      .read('**/*.ts'))

export const lint = task('Lint sources', () =>
  sources()
      .plug(eslint))

export const compile = task('Compile source code', () =>
  lint()
      .plug(typescript())
      .save('build'))

export const test = task('Test compiled code', () =>
  compile()
      .plug(mocha()))
