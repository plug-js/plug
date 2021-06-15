import assert from 'assert'
import { statSync } from 'fs'
import { DirectoryPath, getCurrentDirectoryPath } from './utils/paths'

let projectDir: DirectoryPath = getCurrentDirectoryPath()

export function getProjectDirectory(): DirectoryPath {
  return projectDir
}

export function setProjectDirectory(path: string): void {
  const directory = getCurrentDirectoryPath(path)
  const stat = statSync(directory)
  assert(stat.isDirectory(), `Not a directory: ${directory}`)
  projectDir = directory
}
