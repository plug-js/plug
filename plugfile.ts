import { read, task } from './bootstrap/src'

export const compile = task('Compile source code', () =>
  read('src/**/*.ts', 'test/**/*.ts', '!test/support/**.*')
      .compile('tsconfig.json')
      .write('build', { sourceMaps: 'external' }))
