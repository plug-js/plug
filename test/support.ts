import { resolve } from 'path'
import { existsSync } from 'fs'
import { dirname } from 'path'
import { DirectoryPath } from '../src/utils/paths'
import { options, PlugLog, RunLog } from '../src/utils/log'
import { Files } from '../src/files'
import { Run } from '../src/run'

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
  before(() => options.write = () => {})
  after(() => options.write = logWriter)
}

// "Mock" a "Files", "Run" and "Log"
export function mock(directory: string): { files: Files, run: Run, log: PlugLog & RunLog } {
  const files = new Files(directory as DirectoryPath)
  const run = new Run(files.directory)
  const log = run.log() as PlugLog & RunLog
  return { files, run, log }
}
