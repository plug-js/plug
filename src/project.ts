import { Failure } from './failure'
import { Files } from './files'
import { Run } from './run'
import assert from 'assert'
import { isAbsolute } from 'path'
import { loadBuildFile } from './typescript/loader'
import { makeLog } from './utils/log'

import { DirectoryPath, FilePath, getParent, isChild } from './utils/paths'
import { Task, TaskCall } from './task'

// Never start with a non-absolute file / directory
function checkPaths(file: FilePath, directory = getParent(file)): DirectoryPath {
  assert(isAbsolute(file), `Not an absolute build file: "${file}"`)
  assert(isAbsolute(directory), `Not an absolute directory: "${directory}"`)
  assert(isChild(directory, file), `Build file "${file}" not under "${directory}"`)
  return directory
}

export class Project {
  #taskNames = new Map<Task, string>()
  #tasks = new Map<string, Task>()
  #log = makeLog()

  readonly buildFile: FilePath
  readonly directory: DirectoryPath

  constructor(
      build: Record<string, Task | TaskCall>,
      buildFile: FilePath,
      directory?: DirectoryPath,
  ) {
    directory = checkPaths(buildFile, directory)

    // Never start with a non-absolute file / directory
    assert(isAbsolute(buildFile), `Not an absolute build file: "${buildFile}"`)
    assert(isAbsolute(directory), `Not an absolute directory: "${directory}"`)
    assert(isChild(directory, buildFile), `Build file "${buildFile}" not under "${directory}"`)

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

  async runTask(name: string = 'default'): Promise<Files> {
    const task = this.#tasks.get(name)
    if (! task) throw new Failure(`No such task "${name}"`)
    return task.run(new Run(this))
  }
}

export async function load(buildFile: FilePath, directory?: DirectoryPath): Promise<Project> {
  directory = checkPaths(buildFile, directory)
  const build = await loadBuildFile(buildFile, directory)
  return new Project(build, buildFile, directory)
}
