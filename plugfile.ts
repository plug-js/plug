import { read, task } from './bootstrap/src'

export const compile = task('Compile source code', () =>
  read('src/**/*.ts', 'test/**/*.ts', '!test/support/**.*')
      .compile('tsconfig.json')
      .mocha('test/**/*.test.ts', '!**/*.d.ts')
      .write('build', { sourceMaps: 'external' }))
