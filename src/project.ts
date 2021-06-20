import assert from 'assert'
import { isAbsolute } from 'path'
import { Failure } from './failure'
import { Task, TaskCall } from './task'
import { loadBuildFile } from './typescript/loader'
import { makeLog } from './utils/log'
import { AbsolutePath, DirectoryPath, getParentDirectory } from './utils/paths'

export class Project {
  #taskNames = new Map<Task, string>()
  #tasks = new Map<string, Task>()
  #log = makeLog()

  readonly buildFile: AbsolutePath
  readonly directory: DirectoryPath

  constructor(
      build: Record<string, Task | TaskCall>,
      buildFile: AbsolutePath,
      directory: DirectoryPath,
  ) {
    // Never start with a non-absolute directory
    assert(isAbsolute(directory), `Not an absolute directory: "${directory}"`)

    // We have to be careful, as build files are loaded...
    if (!(build && (typeof build === 'object'))) {
      throw new Failure(`Build file "${buildFile}" has no exports`)
    }

    // We should oly see exported tasks...
    for (const name in build) {
      // Task names must be non-empty strings...
      if (!(name && (typeof name === 'string'))) continue

      // Normally we export task calls "export const foo = task(...)"
      const call = build[name]
      const task = call ? typeof call === 'function' ? (<TaskCall> call).task : call : undefined

      // Now we _should_ have a task... but check it!
      if (typeof task?.run !== 'function') {
        this.#log.alert(`Export "${name}" does not seem to be a valid task`)
      } else {
        this.#taskNames.set(task, name)
        this.#tasks.set(name, task)
      }
    }

    // Set our values and go!
    this.buildFile = buildFile
    this.directory = directory
  }

  getTaskName(task: Task): string {
    return this.#taskNames.get(task) || 'unknown'
  }

  getTask(name: string): Task | undefined {
    return this.#tasks.get(name)
  }

  getTaskNames(): string[] {
    return [ ...this.#tasks.keys() ]
  }

  getTaskDescriptions(): Record<string, string | undefined> {
    const descriptions: Record<string, string | undefined> = {}
    for (const [ name, task ] of this.#tasks.entries()) {
      descriptions[name] = task.description
    }
    return descriptions
  }
}

export function load(buildFile: AbsolutePath, directory?: DirectoryPath): Project {
  // Project directory defaults to directory of build file
  if (! directory) directory = getParentDirectory(buildFile)

  // Load the build file...
  const build = loadBuildFile(directory, buildFile)

  // Create our project from whatever we're given
  return new Project(build, buildFile, directory)
}
