import { expect } from 'chai'
import { run } from '../src/run'
import { Task } from '../src/task'

describe('Run', () => {
  it('should create a new run', () => {
    const task: Task = {} as any
    const r1 = run(task)
    const r2 = run(task)

    expect(r1.id).to.be.a('symbol')
    expect(r2.id).to.be.a('symbol')

    expect(r1.tasks).to.be.an('array').with.length(1)
    expect(r2.tasks).to.be.an('array').with.length(1)

    expect(r1.tasks[0]).to.equal(task)
    expect(r2.tasks[0]).to.equal(task)

    expect(r1.id).to.not.equal(r2.id)
  })

  it('should deive a new run for another task', () => {
    const task1: Task = {} as any
    const task2: Task = {} as any
    const r1 = run(task1)
    const r2 = r1.for(task2)

    expect(r1.id).to.be.a('symbol')
    expect(r2.id).to.be.a('symbol')

    expect(r1.tasks).to.be.an('array').with.length(1)
    expect(r2.tasks).to.be.an('array').with.length(2)

    expect(r1.tasks[0]).to.equal(task1)
    expect(r2.tasks[0]).to.equal(task1)
    expect(r2.tasks[1]).to.equal(task2)

    expect(r1.id).to.equal(r2.id)
  })
})
