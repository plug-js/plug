import { AssertionError } from 'assert'
import { expect } from 'chai'
import { VirtualFileList } from '../src/files'
import { PlugPipe, Processor } from '../src/pipe'
import { getProjectDirectory } from '../src/project'
import { parallel, task } from '../src/task'

describe('Plug Tasks', () => {
  function make(process: Processor): PlugPipe {
    return new PlugPipe(undefined, { process })
  }

  it('should construct a task and run it once', async () => {
    let counter = 0

    const pipe = make((input) => {
      counter ++
      return input
    })

    const task1 = task('test task', pipe)

    expect(task1).to.be.a('function')
    expect(task1.task).to.be.an('object')
    expect(task1.task.run).to.be.a('function')
    expect(task1.task.description).to.equal('test task')

    const run = {} as any

    // Initial run
    await task1.task.run(run)
    expect(counter).to.equal(1)

    // No run, cached output
    await task1.task.run(run)
    expect(counter).to.equal(1)

    // New "run", should run again
    await task1.task.run({} as any)
    expect(counter).to.equal(2)
  })

  it('should chain multiple tasks', async () => {
    let counter1 = 0
    const task1 = task('test task', make(() => {
      counter1 ++
      return 'task1' as any
    }))

    let counter2 = 0
    const task2 = task(task1().plug((input) => {
      counter2 ++
      expect(input).to.equal('task1')
      return 'task2' as any
    }))

    const run = {} as any

    // first run task2, it'll invoke task1, then re-invoke task1
    const result2 = await task2.task.run(run)
    const result1 = await task1.task.run(run)
    expect(counter1).to.equal(1)
    expect(counter2).to.equal(1)
    expect(result1).to.equal('task1')
    expect(result2).to.equal('task2')

    await task1.task.run(run)
    await task2.task.run(run)
    expect(counter1).to.equal(1)
    expect(counter2).to.equal(1)

    // new runs (both cases), so counters will update
    await task2.task.run({} as any)
    await task1.task.run({} as any)
    expect(counter1).to.equal(3)
    expect(counter2).to.equal(2)
  })

  it('should fail a task when constructed with the wrong type', async () => {
    await expect(task({} as any).task.run({} as any))
        .to.be.rejectedWith(AssertionError, 'Invalid task source')
  })

  it('should create a parallel task', async () => {
    const slow = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))


    let counter = 0

    const files = new VirtualFileList('/abc')
    const task0 = task(make(() => files))


    const task1 = task(() => task0().plug(make(async (input) => {
      await slow(20) // finish last!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxx.txt', { contents: 'first' })
      list.add(`foo${++ counter}.txt`)
      return list
    })))

    const task2 = task(() => task0().plug(make(async (input) => {
      await slow(10) // finish in between!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxx.txt', { contents: 'second' })
      list.add(`bar${++ counter}.txt`)
      return list
    })))

    const task3 = task(() => task0().plug(make((input) => {
      // immediate!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxx.txt', { contents: 'third' })
      list.add(`baz${++ counter}.txt`)
      return Promise.resolve(list)
    })))


    counter = 0
    const taskA = parallel(task1.task, task2.task, task3.task)
    const resultA = await taskA.task.run({} as any)

    expect(taskA.task.description).to.be.undefined
    expect(resultA.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo3.txt', // ran last
      '/abc/bar2.txt', // in between
      '/abc/baz1.txt', // fastest
      '/abc/xxx.txt',
    ].sort())

    // Always rooted in project path
    expect(resultA.directoryPath).to.equal(getProjectDirectory())
    expect(resultA.get('/abc/xxx.txt').contentsSync()).to.equal('third') // task3 is last

    // REVERSE THE ORDER!

    counter = 0
    const taskB = parallel('reversed', task3, task2, task1)
    const resultB = await taskB.task.run({} as any)

    expect(taskB.task.description).to.equal('reversed')
    expect(resultB.list().map((f) => f.absolutePath).sort()).to.eql([
      '/abc/foo3.txt', // ran last
      '/abc/bar2.txt', // in between
      '/abc/baz1.txt', // fastest
      '/abc/xxx.txt',
    ].sort())

    // Always rooted in project path
    expect(resultB.directoryPath).to.equal(getProjectDirectory())
    expect(resultB.get('/abc/xxx.txt').contentsSync()).to.equal('first') // task1 is last
  })
})
