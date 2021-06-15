import { VirtualFileSystem } from './virtual-file-system'

/**
 * The main interface defining a plug _processor_, a coponent of a plug pipe.
 */
export interface Plug {
  process: (input: VirtualFileSystem) => VirtualFileSystem | Promise<VirtualFileSystem>
}

export { Pipeline } from './pipeline'
export { VirtualFileSystem, VirtualFile } from './virtual-file-system'
export { getProjectDirectory, setProjectDirectory } from './project'

import { Pipeline } from './pipeline'
import { PlugTask } from './task'

export * from './plugs'

export const read = Pipeline.read
export const from = Pipeline.from
export const task = PlugTask.task
