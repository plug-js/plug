import type { DirectoryPath, RelativeDirectoryPath } from './utils/paths'
import type { GlobOptions } from './utils/globs'
import type { Run } from './run'

import { Files } from './files'
import { PlugPipe, TaskPipe } from './pipe'
import { glob } from './utils/globs'
import { resolvePath } from './utils/paths'

// At least one glob, and optional options at the end
type ReadArguments = [ string, ...string[], GlobOptions ] | [ string, ...string[] ]

async function readDirectory(
    run: Run,
    directory: DirectoryPath,
    ...args: ReadArguments
): Promise<Files> {
  const last = args.splice(-1)[0]
  const { globs, options } = typeof last === 'string' ? {
    globs: [ ...args as string[], last ],
    options: {},
  } : {
    globs: [ ...args as string[] ],
    options: last,
  }

  const log = run.log()
  const now = Date.now()
  const files = new Files(run)
  await glob(directory, globs, options, (path) => {
    const file = files.add(path)
    log.trace(`Adding file "${file.absolutePath}"`)
  })

  log.debug(`Directory "${directory}" scanned in`, Date.now() - now, 'ms')
  return files
}

export function read(...args: ReadArguments): TaskPipe {
  return new TaskPipe({ run: (run) => {
    const directory = run.project.directory
    return readDirectory(run, directory, ...args)
  } })
}

export function from(path: string): { read: typeof read } {
  return { read: (...args: ReadArguments) =>
    new TaskPipe({ run: (run) => {
      const directory = resolvePath(run.project.directory, path as RelativeDirectoryPath)
      return readDirectory(run, directory, ...args)
    } }),
  }
}

export function pipe(): PlugPipe {
  return new PlugPipe()
}
