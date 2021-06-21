/* eslint-disable no-console */

import { resolve } from 'path'
import { existsSync } from 'fs'
import { dirname } from 'path'
import { DirectoryPath, getAbsolutePath, RelativePath } from '../src/utils/paths'
import { options, PlugLog, RunLog } from '../src/utils/log'
import { Files } from '../src/files'
import { Run } from '../src/run'
import { Project } from '../src/project'
import { Task } from '../src/task'

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
  const build = getAbsolutePath(files.directory, 'build.ts' as RelativePath)

  const tasks: Record<string, Task> = {}
  for (const t of [ name, ...names ]) tasks[t] = { run: () => files }

  const project = new Project(tasks, build)
  const run = new Run(project)
  const log = run.log() as PlugLog & RunLog

  return { files, run, log, project, tasks }
}
