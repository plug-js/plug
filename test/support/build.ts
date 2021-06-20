import { task, from, read } from '../../src/index'

export default task('... the default ...', () => read('**/*.ts'))
export const task1 = task('... a description ...', () => from('.').read('**/*.ts'))
export const task2 = task(from('.').read('**/*.ts'))
