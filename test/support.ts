/* eslint-disable no-console */

import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

import { Files } from '../src/files'
import { Project } from '../src/project'
import { Run } from '../src/run'
import { Task } from '../src/task'
import { dirname } from 'path'
import { existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'

import { DirectoryPath, createFilePath } from '../src/utils/paths'
import { Log, LogLevel, logOptions } from '../src/utils/log'
import assert from 'assert'

function findDirectory(directory: string): string {
  if (existsSync(resolve(directory, 'package.json'))) return directory
  const parent = dirname(directory)
  if (directory === parent) throw new Error('File "package.json" not found')
  return findDirectory(parent)
}

// This directory _may_ be relocated under build, so find it...
export const directory = resolve(findDirectory(__dirname), 'test', 'support') as DirectoryPath

// Inject hooks to disable logs
const logLevel = logOptions.level
export function disableLogs(): void {
  before(() => {
    console.log('    \u001b[38;5;63m\u2605\u001b[0m disabling logs')
    if (process.env.LOG_LEVEL !== 'debug') logOptions.level = LogLevel.QUIET
  })
  after(() => {
    console.log('    \u001b[38;5;63m\u2605\u001b[0m re-enabling logs')
    logOptions.level = logLevel
  })
}

// Mock a VERY simple project...
type MockProject = {
  files: Files,
  run: Run,
  log: Log,
  project: Project,
  tasks: Record<string, Task>,
}

export function mock(
    directory: string,
    name: string = 'task',
    ...names: string[]
): MockProject {
  assert(isAbsolute(directory), 'Not mocking a relative directory')
  const build = createFilePath(directory as DirectoryPath, 'build.ts')

  const tasks: Record<string, Task> = {}
  for (const t of [ name, ...names ]) tasks[t] = { run: () => files }

  const project = new Project(tasks, build)
  const run = new Run(project)
  const files = Files.for(run)
  const log = run.log()

  return { files, run, log, project, tasks }
}
