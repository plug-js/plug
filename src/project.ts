import assert from 'assert'
import { statSync } from 'fs'
import { resolve } from 'path'
import { Task } from './task'
import { DirectoryPath } from './utils/paths'

let projectDir = undefined as DirectoryPath | undefined

export function getProjectDirectory(): DirectoryPath {
  return projectDir || process.cwd() as DirectoryPath
}

export function setProjectDirectory(path: string): void {
  const directory = resolve(process.cwd(), path)
  const stat = statSync(directory)
  assert(stat.isDirectory(), `Not a directory: ${directory}`)
  projectDir = directory as DirectoryPath
}

const taskNames = new Map<Task, string>()

export function setTaskName(task: Task, name: string): void {
  taskNames.set(task, name)
}

export function getTaskName(task: Task): string {
  return taskNames.get(task) || 'unknown'
}
