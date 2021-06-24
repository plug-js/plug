import { read, task } from './build/src'

export const compile = task('Compile source code', () =>
  read('src/**/*.ts', 'test/**/*.ts', '!test/support/**.*')
      .compile('tsconfig.json')
      .write('bootstrap', { sourceMaps: 'external' }))
