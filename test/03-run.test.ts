import { expect } from 'chai'
import { inspect } from 'util'
import { Plug } from '../src/pipe'
import { Run } from '../src/run'
import { Task } from '../src/task'
import { DirectoryPath } from '../src/utils/paths'

describe('Run', () => {
  it('should create a new run', () => {
    const task: Task = {} as any
    const run0 = new Run('/foo' as DirectoryPath)
    const run1 = new Run('/foo' as DirectoryPath).for(task)
    const run2 = new Run('/foo' as DirectoryPath).for(task)

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
    const run1 = new Run('/foo' as DirectoryPath).for(task1)
    const run2 = run1.for(task2)

    expect(run1.tasks).to.be.an('array').with.length(1)
    expect(run2.tasks).to.be.an('array').with.length(2)

    expect(run1.tasks[0]).to.equal(task1)
    expect(run2.tasks[0]).to.equal(task1)
    expect(run2.tasks[1]).to.equal(task2)

    expect(run1.id).to.equal(run2.id)
  })

  it('should have nice run ids', () => {
    const run = new Run('/foo' as DirectoryPath)
    expect(run.id.toString()).to.match(/^[a-f0-9]{16}$/)
    expect((<any>run.id)[inspect.custom]()).to.match(/^[a-f0-9]{16}$/)
  })

  it('should prepare and cache logs', () => {
    const run = new Run('/foo' as DirectoryPath)

    const runLog1 = run.log()
    const runLog2 = run.log()
    expect(runLog1).to.equal(runLog2)
    expect(runLog1).to.be.a('function')
    expect(runLog1.run).to.equal(run)

    const plug1: Plug = { process: (i) => i }
    const plug2: Plug = { process: (i) => i }
    const plugLog1A = run.log(plug1)
    const plugLog1B = run.log(plug1)
    const plugLog2A = run.log(plug2)
    const plugLog2B = run.log(plug2)
    expect(plugLog1A).to.equal(plugLog1B)
    expect(plugLog2A).to.equal(plugLog2B)
    expect(plugLog1A).not.to.equal(plugLog2B)
    expect(plugLog1A).to.be.a('function')
    expect(plugLog2A).to.be.a('function')
    expect(plugLog1A.plug).to.equal(plug1)
    expect(plugLog2A.plug).to.equal(plug2)
    expect(plugLog1A).to.have.property('run', run)
    expect(plugLog2A).to.have.property('run', run)
  })
})
