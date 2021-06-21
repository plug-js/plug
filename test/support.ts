/* eslint-disable no-console */

import { Files } from '../src/files'
import { Project } from '../src/project'
import { Run } from '../src/run'
import { Task } from '../src/task'
import { dirname } from 'path'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { DirectoryPath, RelativeFilePath, resolvePath } from '../src/utils/paths'
import { PlugLog, RunLog, options } from '../src/utils/log'

function findDirectory(directory: string): string {
  if (existsSync(resolve(directory, 'package.json'))) return directory
  const parent = dirname(directory)
  if (directory === parent) throw new Error('File "package.json" not found')
  return findDirectory(parent)
}

// This directory _may_ be relocated under build, so find it...
export const directory = resolve(findDirectory(__dirname), 'test', 'support') as DirectoryPath

// Inject hooks to disable logs
const logWriter = options.write
export function disableLogs(): void {
  before(() => {
    console.log('    \u001b[38;5;63m\u2605\u001b[0m disabling logs')
    options.write = () => {}
  })
  after(() => {
    console.log('    \u001b[38;5;63m\u2605\u001b[0m re-enabling logs')
    options.write = logWriter
  })
}

// Mock a VERY simple project...
type MockProject = {
  files: Files,
  run: Run,
  log: PlugLog & RunLog,
  project: Project,
  tasks: Record<string, Task>,
}

export function mock(
    directory: string,
    name: string = 'task',
    ...names: string[]
): MockProject {
  const files = new Files(directory as DirectoryPath)
  const build = resolvePath(files.directory, 'build.ts' as RelativeFilePath)

  const tasks: Record<string, Task> = {}
  for (const t of [ name, ...names ]) tasks[t] = { run: () => files }

  const project = new Project(tasks, build)
  const run = new Run(project)
  const log = run.log() as PlugLog & RunLog

  return { files, run, log, project, tasks }
}
