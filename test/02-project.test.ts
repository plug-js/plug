import { expect } from 'chai'
import { getTaskName, setTaskName } from '../src/project'

describe('Project', () => {
  it('should register and return a task name', () => {
    const task = {} as any
    expect(getTaskName(task)).to.equal('unknown')
    setTaskName(task, 'foobar')
    expect(getTaskName(task)).to.equal('foobar')
  })
})
