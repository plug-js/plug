export * from './plugs'

import { PlugPipe } from './pipe'

export function pipe(): PlugPipe {
  return new PlugPipe()
}

export { task, parallel } from './task'
