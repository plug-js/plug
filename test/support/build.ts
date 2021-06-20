import { task, from } from '../../src/index'

export const task1 = task(() =>
  from('.')
      .read('**/*.ts'))
