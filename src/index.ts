import { VirtualFileList } from './files'

export type PlugProcessor = (
  input: VirtualFileList,
  taskNames?: readonly string[],
) => VirtualFileList | Promise<VirtualFileList>

/**
 * The main interface defining a plug _processor_, a coponent of a plug pipe.
 */
export interface Plug {
  process: PlugProcessor
}

import { Pipe } from './pipe'
import { Task } from './task'

export * from './plugs'

export const pipe = Pipe.pipe
export const task = Task.task
