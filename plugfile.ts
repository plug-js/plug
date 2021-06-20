import { from, task } from './src'

const typescript: any = null
const eslint: any = null
const mocha: any = null

const sources = from('src').read('**/*.ts')

export const lint = task('Lint sources', () =>
  sources
      .plug(eslint))

export const compile = task('Compile source code', () => {
  const q = lint()
      .plug(typescript())
      .plug(mocha())
      // .from('foo')
      // .plug(lint())
      // .save('build')
      // .from('doo'))
  return q
})

export const test = task('Test compiled code', () =>
  compile()
      .plug(mocha()))

// export const xxx = task('Foo', () =>
//   pipe().plug(mocha))
