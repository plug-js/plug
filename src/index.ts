import { VirtualFileList } from './files'

/**
 * The main interface defining a plug _processor_, a coponent of a plug pipe.
 */
export interface Plug {
  process: (input: VirtualFileList) => VirtualFileList | Promise<VirtualFileList>
}

import { Pipe } from './pipe'
import { Task } from './task'

export * from './plugs'

export const pipe = Pipe.pipe
export const task = Task.task
