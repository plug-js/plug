import { Files } from './files'
import { PlugPipe, TaskPipe } from './pipe'
import { glob, GlobOptions } from './utils/globs'
import { DirectoryPath, getDirectoryPath, RelativeDirectoryPath } from './utils/paths'

// At least one glob, and optional options at the end
type ReadArguments = [ string, ...string[], GlobOptions ] | [ string, ...string[] ]

async function readDirectory(directory: DirectoryPath, ...args: ReadArguments): Promise<Files> {
  const last = args.splice(-1)[0]
  const { globs, options } = typeof last === 'string' ? {
    globs: [ ...args as string[], last ],
    options: {},
  } : {
    globs: [ ...args as string[] ],
    options: last,
  }

  const files = new Files(directory)
  await glob(directory, globs, options, (path) => {
    return files.add(path).contents().then(() => void 0)
  })

  return files
}

export function read(...args: ReadArguments): TaskPipe {
  return new TaskPipe({ run: (run) => readDirectory(run.directory, ...args) })
}

export function from(directory: string): { read: typeof read } {
  return { read: (...args: ReadArguments) =>
    new TaskPipe({ run: (run) =>
      readDirectory(getDirectoryPath(run.directory, directory as RelativeDirectoryPath), ...args),
    }) }
}

export function pipe(): PlugPipe {
  return new PlugPipe()
}
