import assert from 'assert'

import { Run } from './run'
import { getParent, isChild } from './utils/paths'
import { isAbsolute } from 'path'
import { log } from './utils/log'

import type { DirectoryPath, FilePath } from './utils/paths'
import type { Files } from './files'
import type { Task, TaskCall } from './task'

export class Project {
  #taskNames = new Map<Task, string>()
  #tasks = new Map<string, Task>()

  readonly buildFile: FilePath
  readonly directory: DirectoryPath

  constructor(
      build: Record<string, Task | TaskCall>,
      buildFile: FilePath,
      directory?: DirectoryPath,
  ) {
    // Never start with a non-absolute file / directory
    if (! directory) directory = getParent(buildFile)
    assert(isAbsolute(buildFile), `Not an absolute build file: "${buildFile}"`)
    assert(isAbsolute(directory), `Not an absolute directory: "${directory}"`)
    assert(isChild(directory, buildFile), `Build file "${buildFile}" not under "${directory}"`)

    // We have to be careful, as build files are loaded...
    if (!(build && (typeof build === 'object'))) {
      throw new Error(`Build file "${buildFile}" has no exports`)
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
        log.alert(`Export "${name}" does not seem to be a valid task`)
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
    const run = new Run(this)
    const task = this.#tasks.get(name)
    return task ? task.run(run) : run.fail(`No such task "${name}"`)
  }
}
