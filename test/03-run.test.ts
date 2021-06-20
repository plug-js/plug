import { expect } from 'chai'
import { inspect } from 'util'
import { Run } from '../src/run'
import { Task } from '../src/task'

describe('Run', () => {
  it('should create a new run', () => {
    const task: Task = {} as any
    const run0 = new Run()
    const run1 = new Run().for(task)
    const run2 = new Run().for(task)

    expect(run0.tasks).to.be.an('array').with.length(0)
    expect(run1.tasks).to.be.an('array').with.length(1)
    expect(run2.tasks).to.be.an('array').with.length(1)

    expect(run1.tasks[0]).to.equal(task)
    expect(run2.tasks[0]).to.equal(task)

    expect(run0.id).to.not.equal(run1.id)
    expect(run0.id).to.not.equal(run2.id)
    expect(run1.id).to.not.equal(run2.id)
  })

  it('should deive a new run for another task', () => {
    const task1: Task = {} as any
    const task2: Task = {} as any
    const run1 = new Run().for(task1)
    const run2 = run1.for(task2)

    expect(run1.tasks).to.be.an('array').with.length(1)
    expect(run2.tasks).to.be.an('array').with.length(2)

    expect(run1.tasks[0]).to.equal(task1)
    expect(run2.tasks[0]).to.equal(task1)
    expect(run2.tasks[1]).to.equal(task2)

    expect(run1.id).to.equal(run2.id)
  })

  it('should have nice run ids', () => {
    const run = new Run()
    expect(run.id.toString()).to.match(/^[a-f0-9]{16}$/)
    expect((<any>run.id)[inspect.custom]()).to.match(/^[a-f0-9]{16}$/)
  })
})