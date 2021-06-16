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

    const result1 = await task3.run(list)
    expect(result1.directoryPath).to.equal('/abc')
    expect(result1.list()).to.have.length(3)
    expect(result1.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo1.txt',
      '/abc/bar2.txt',
      '/abc/baz3.txt',
    ].sort())
  })

  it('should create a parallel task', async () => {
    const slow = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

    const files = new VirtualFileList('/abc')

    let counter = 0
    const task1 = Task.task(() => Pipe.pipe().plug(async (input) => {
      expect(input).to.equal(files)
      await slow(100) // finish last!
      const list = input.clone()
      list.add(`foo${++ counter}.txt`)
      list.add('xxx.txt', 'first')
      return list
    }))

    const task2 = Task.task(() => Pipe.pipe().plug(async (input) => {
      expect(input).to.equal(files)
      await slow(50) // finish in between!
      const list = input.clone()
      list.add(`bar${++ counter}.txt`)
      list.add('xxx.txt', 'second')
      return list
    }))

    const task3 = Task.task(() => Pipe.pipe().plug((input) => {
      expect(input).to.equal(files)
      // immediate!
      const list = input.clone()
      list.add(`baz${++ counter}.txt`)
      list.add('xxx.txt', 'third')
      return Promise.resolve(list)
    }))

    counter = 0
    const taskA = Task.parallel(task1, task2, task3)
    const resultA = await taskA.run(files)

    expect(taskA.task.description).to.be.undefined
    expect(resultA.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo3.txt', // ran last
      '/abc/bar2.txt', // in between
      '/abc/baz1.txt', // fastest
      '/abc/xxx.txt',
    ].sort())
    expect(resultA.get('xxx.txt').contentsSync()).to.equal('third') // task3 is last

    // REVERSE THE ORDER!

    counter = 0
    const taskB = Task.parallel('reversed', task3, task2, task1)
    const resultB = await taskB.run(files)

    expect(taskB.task.description).to.equal('reversed')
    expect(resultB.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo3.txt', // ran last
      '/abc/bar2.txt', // in between
      '/abc/baz1.txt', // fastest
      '/abc/xxx.txt',
    ].sort())
    expect(resultB.get('xxx.txt').contentsSync()).to.equal('first') // task1 is last
  })
})
