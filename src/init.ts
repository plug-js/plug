import { Files } from './files'
import { PlugPipe, TaskPipe } from './pipe'
import { createDirectoryPath } from './utils/paths'

import type { DirectoryPath } from './utils/paths'
import type { Run } from './run'
import { walk, WalkOptions } from './utils/walk'
import { ParseOptions } from './utils/options'

async function readDirectory(run: Run, directory: DirectoryPath, ...args: ParseOptions<WalkOptions>) : Promise<Files> {
  const log = run.log()
  const time = log.start()

  const files = new Files(run)
  for await (const path of walk(directory, ...args)) files.add(path)

  log.debug(`Directory "${directory}" scanned in`, time)
  return files
}

export function read(...args: ParseOptions<WalkOptions>): TaskPipe {
  return new TaskPipe({ run: (run) => {
    const directory = run.project.directory
    return readDirectory(run, directory, ...args)
  } })
}

export function from(path: string): { read: typeof read } {
  return { read: (...args: ParseOptions<WalkOptions>) =>
    new TaskPipe({ run: (run) => {
      const directory = createDirectoryPath(run.project.directory, path)
      return readDirectory(run, directory, ...args)
    } }),
  }
}

export function pipe(): PlugPipe {
  return new PlugPipe()
}
