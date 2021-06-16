import { expect } from 'chai'
import { VirtualFileList } from '../src/files'
import { Pipe } from '../src/pipe'
import { getProjectDirectory } from '../src/project'
import { Task } from '../src/task'

describe('Plug Tasks', () => {
  it('should construct a task', async () => {
    let counter = 0
    const task = Task.task('test task', () => Pipe.pipe().plug((input) => {
      input.add(`bar${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    expect(task).to.be.a('function')
    expect(task.run).to.be.a('function')
    expect(task.task).to.be.instanceof(Task)
    expect(task.task.description).to.equal('test task')

    const list = new VirtualFileList('/foo')

    const result1 = await task.task.process(list)
    expect(result1.directoryPath).to.equal('/foo')
    expect(result1.list()).to.have.length(1)
    expect(result1.list()[0].absolutePath).to.equal('/foo/bar1.txt')

    const result2 = await task.run()
    expect(result2.directoryPath).to.equal(getProjectDirectory())
    expect(result2.list()).to.have.length(1)
    expect(result2.list()[0].absolutePath).to.equal(`${getProjectDirectory()}/bar2.txt`)
  })

  it('should chain multiple tasks', async () => {
    let counter = 0
    const task1 = Task.task('test task', () => Pipe.pipe().plug((input) => {
      input.add(`foo${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    const task2 = Task.task('', () => task1().plug((input) => {
      input.add(`bar${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    const task3 = Task.task(() => task2().plug((input) => {
      input.add(`baz${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    expect(task1.task.description).to.equal('test task')
    expect(task2.task.description).to.be.undefined
    expect(task3.task.description).to.be.undefined

    const list = new VirtualFileList('/abc')

    const result1 = await task3.task.process(list)
    expect(result1.directoryPath).to.equal('/abc')
    expect(result1.list()).to.have.length(3)
    expect(result1.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo1.txt',
      '/abc/bar2.txt',
      '/abc/baz3.txt',
    ].sort())
  })
})
