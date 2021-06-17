import { expect } from 'chai'
import { VirtualFileList } from '../src/files'
import { Pipe } from '../src/pipe'
import { getProjectDirectory, setTaskName } from '../src/project'
import { Task } from '../src/task'

describe('Plug Tasks', () => {
  it('should construct a task', async () => {
    let counter = 0
    const task = Task.task('test task', () => Pipe.pipe().plug((input, { taskNames }) => {
      expect(taskNames).eql([ 'testTask' ])
      input.add(`bar${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    setTaskName(task.task, 'testTask')

    expect(task).to.be.a('function')
    expect(task.run).to.be.a('function')
    expect(task.task).to.be.instanceof(Task)
    expect(task.task.description).to.equal('test task')

    const list = new VirtualFileList('/foo')

    const result1 = await task.task.process(list, { taskNames: [] })
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
    const task1 = Task.task('test task', () => Pipe.pipe().plug((input, { taskNames }) => {
      expect(taskNames).to.eql([ 'task3', 'task2', 'task1' ])
      input.add(`foo${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    const task2 = Task.task('', () => task1().plug((input, { taskNames }) => {
      expect(taskNames).to.eql([ 'task3', 'task2' ])
      input.add(`bar${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    const task3 = Task.task(() => task2().plug((input, { taskNames }) => {
      expect(taskNames).to.eql([ 'task3' ])
      input.add(`baz${++ counter}.txt`)
      return Promise.resolve(input)
    }))

    setTaskName(task1.task, 'task1')
    setTaskName(task2.task, 'task2')
    setTaskName(task3.task, 'task3')

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
    const task1 = Task.task(() => Pipe.pipe().plug(async (input, { taskNames }) => {
      await slow(20) // finish last!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add(`foo${++ counter}.txt`, `${taskNames?.join()}`)
      list.add('xxx.txt', 'first')
      return list
    }))

    const task2 = Task.task(() => Pipe.pipe().plug(async (input, { taskNames }) => {
      await slow(10) // finish in between!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add(`bar${++ counter}.txt`, `${taskNames?.join()}`)
      list.add('xxx.txt', 'second')
      return list
    }))

    const task3 = Task.task(() => Pipe.pipe().plug((input, { taskNames }) => {
      // immediate!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add(`baz${++ counter}.txt`, `${taskNames?.join()}`)
      list.add('xxx.txt', 'third')
      return Promise.resolve(list)
    }))

    const taskA = Task.parallel(task1, task2, task3)
    const taskB = Task.parallel('reversed', task3, task2, task1)

    setTaskName(task1.task, 'task1')
    setTaskName(task2.task, 'task2')
    setTaskName(task3.task, 'task3')
    setTaskName(taskA.task, 'taskA')
    setTaskName(taskB.task, 'taskB')

    counter = 0
    const resultA = await taskA.run(files)

    expect(taskA.task.description).to.be.undefined
    expect(resultA.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo3.txt', // ran last
      '/abc/bar2.txt', // in between
      '/abc/baz1.txt', // fastest
      '/abc/xxx.txt',
    ].sort())
    expect(resultA.get('xxx.txt').contentsSync()).to.equal('third') // task3 is last
    expect(resultA.get('foo3.txt').contentsSync()).to.equal('taskA,task1')
    expect(resultA.get('bar2.txt').contentsSync()).to.equal('taskA,task2')
    expect(resultA.get('baz1.txt').contentsSync()).to.equal('taskA,task3')

    // REVERSE THE ORDER!

    counter = 0
    const resultB = await taskB.run(files)

    expect(taskB.task.description).to.equal('reversed')
    expect(resultB.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo3.txt', // ran last
      '/abc/bar2.txt', // in between
      '/abc/baz1.txt', // fastest
      '/abc/xxx.txt',
    ].sort())
    expect(resultB.get('xxx.txt').contentsSync()).to.equal('first') // task1 is last
    expect(resultB.get('foo3.txt').contentsSync()).to.equal('taskB,task1')
    expect(resultB.get('bar2.txt').contentsSync()).to.equal('taskB,task2')
    expect(resultB.get('baz1.txt').contentsSync()).to.equal('taskB,task3')
  })
})
