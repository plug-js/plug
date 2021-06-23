import { Files } from './files'
import { Project } from './project'
import { DirectoryPath, RelativeDirectoryPath, resolvePath } from './utils/paths'
import { GlobOptions, glob } from './utils/globs'
import { PlugPipe, TaskPipe } from './pipe'

// At least one glob, and optional options at the end
type ReadArguments = [ string, ...string[], GlobOptions ] | [ string, ...string[] ]

async function readDirectory(
    project: Project,
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

  const files = new Files(project)
  await glob(directory, globs, options, (path) => {
    return files.add(path).contents().then(() => void 0)
  })

  return files
}

export function read(...args: ReadArguments): TaskPipe {
  return new TaskPipe({ run: (run) => readDirectory(run.project, run.directory, ...args) })
}

export function from(directory: string): { read: typeof read } {
  return { read: (...args: ReadArguments) =>
    new TaskPipe({ run: (run) =>
      readDirectory(run.project, resolvePath(run.directory, directory as RelativeDirectoryPath), ...args),
    }) }
}

export function pipe(): PlugPipe {
  return new PlugPipe()
}
