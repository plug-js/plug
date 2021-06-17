import { VirtualFileList } from './files'

export interface Run {
  readonly taskNames: readonly string[]
}

export type Processor = (input: VirtualFileList, run: Run) => VirtualFileList | Promise<VirtualFileList>

/**
 * The main interface defining a plug _processor_, a coponent of a plug pipe.
 */
export interface Plug {
  process: Processor
}

import { Pipe } from './pipe'
import { Task } from './task'

export * from './plugs'

export const pipe = Pipe.pipe
export const task = Task.task
