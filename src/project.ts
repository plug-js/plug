import { Task } from './task'

const taskNames = new WeakMap<Task, string>()

export function setTaskName(task: Task, name: string): void {
  taskNames.set(task, name)
}

export function getTaskName(task: Task): string {
  return taskNames.get(task) || 'unknown'
}
