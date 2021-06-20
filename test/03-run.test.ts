import { expect } from 'chai'
import { start } from '../src/run'
import { Task } from '../src/task'

describe('Run', () => {
  it('should create a new run', () => {
    const task: Task = {} as any
    const r0 = start()
    const r1 = start().for(task)
    const r2 = start().for(task)

    expect(r0.id).to.be.a('symbol')
    expect(r1.id).to.be.a('symbol')
    expect(r2.id).to.be.a('symbol')

    expect(r0.tasks).to.be.an('array').with.length(0)
    expect(r1.tasks).to.be.an('array').with.length(1)
    expect(r2.tasks).to.be.an('array').with.length(1)

    expect(r1.tasks[0]).to.equal(task)
    expect(r2.tasks[0]).to.equal(task)

    expect(r0.id).to.not.equal(r1.id)
    expect(r0.id).to.not.equal(r2.id)
    expect(r1.id).to.not.equal(r2.id)
  })

  it('should deive a new run for another task', () => {
    const task1: Task = {} as any
    const task2: Task = {} as any
    const r1 = start().for(task1)
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
