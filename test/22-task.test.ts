import { expect } from 'chai'
import { Files } from '../src/files'
import { PlugPipe, Processor, TaskPipe } from '../src/pipe'
import { getProjectDirectory } from '../src/project'
import { Run, Runnable } from '../src/run'
import { parallel, Task, task } from '../src/task'
import { disableLogs } from './support'

describe('Plug Tasks', () => {
  function init(run: Runnable['run']): TaskPipe {
    return new TaskPipe({ run })
  }

  disableLogs()

  it('should construct a task and run it once', async () => {
    let counter = 0
    let runid: any = undefined

    const pipe = init((run) => {
      expect(run.tasks).to.have.length(1)
      expect(run.tasks[0]).to.equal(task1.task)
      runid = run.id
      counter ++
      return undefined as any
    })

    const task1 = task('test task', pipe)
    expect(task1).to.be.a('function')
    expect(task1.task).to.be.an('object')
    expect(task1.task.run).to.be.a('function')
    expect(task1.task.description).to.equal('test task')

    const run1 = new Run()

    // Initial run
    await task1.task.run(run1)
    expect(counter).to.equal(1)
    expect(runid).to.equal(run1.id)
    runid = undefined

    // No run, cached output
    await task1.task.run(run1)
    expect(counter).to.equal(1)
    expect(runid).to.be.undefined // does not run again!

    // New "run", should run again
    const run2 = new Run()
    await task1.task.run(run2)
    expect(counter).to.equal(2)
    expect(runid).to.equal(run2.id)
  })

  it('should cache also when a task fails', async () => {
    let counter = 0
    let runid: any = undefined

    const pipe = init((run) => {
      expect(run.tasks).to.have.length(1)
      expect(run.tasks[0]).to.equal(task1.task)
      runid = run.id
      counter ++
      throw new Error('Foo!')
    })

    const task1 = task('test task', pipe)
    const run1 = new Run()

    const error1 = await expect(task1.task.run(run1))
        .to.be.rejectedWith(Error, 'Foo!')
    expect(counter).to.equal(1)
    expect(runid).to.equal(run1.id)
    runid = undefined

    // No run, cached error
    const error2 = await expect(task1.task.run(run1))
        .to.be.rejectedWith(Error, 'Foo!')
    expect(counter).to.equal(1)
    expect(runid).to.be.undefined // does not run again!

    // Same error
    expect(error1).to.equal(error2)
  })

  it('should chain multiple tasks', async () => {
    let counter1 = 0
    const task1 = task('test task', init(() => {
      counter1 ++
      return 'task1' as any
    }))

    let counter2 = 0
    const task2 = task(task1().plug((input) => {
      counter2 ++
      expect(input).to.equal('task1')
      return 'task2' as any
    }))

    const run = new Run()

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
    await task2.task.run(new Run())
    await task1.task.run(new Run())
    expect(counter1).to.equal(3)
    expect(counter2).to.equal(2)
  })

  it('should create a parallel task', async () => {
    const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
    function pipe(process: Processor): PlugPipe {
      return new PlugPipe(undefined, { process })
    }

    const dir = getProjectDirectory()
    let counter = 0
    let tasks = undefined as readonly Task[] | undefined

    const files = new Files()
    const task0 = task('zero', init((run) => {
      tasks = run.tasks
      return files
    }))

    const task1 = task('one', () => task0().plug(pipe(async (input) => {
      await sleep(20) // finish last!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxxx.txt', { contents: 'first' })
      list.add(`foo${++ counter}.txt`)
      return list
    })))

    const task2 = task('two', () => task0().plug(pipe(async (input) => {
      await sleep(10) // finish in between!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxxx.txt', { contents: 'second' })
      list.add(`bar${++ counter}.txt`)
      return list
    })))

    const task3 = task('three', () => task0().plug(pipe((input) => {
      // immediate!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxxx.txt', { contents: 'third' })
      list.add(`baz${++ counter}.txt`)
      return Promise.resolve(list)
    })))


    counter = 0
    const taskA = parallel(task1.task, task2.task, task3.task)
    const resultA = await taskA.task.run(new Run())

    expect(taskA.task.description).to.be.undefined
    expect(resultA.list().sort()).to.eql([
      { absolutePath: `${dir}/bar2.txt`, originalPath: `${dir}/bar2.txt` },
      { absolutePath: `${dir}/baz1.txt`, originalPath: `${dir}/baz1.txt` },
      { absolutePath: `${dir}/foo3.txt`, originalPath: `${dir}/foo3.txt` },
      { absolutePath: `${dir}/xxxx.txt`, originalPath: `${dir}/xxxx.txt` },
    ])

    // Always rooted in project path
    expect(resultA.directory).to.equal(getProjectDirectory())
    expect(resultA.get('xxxx.txt').contentsSync()).to.equal('third') // task3 is last

    // Tasks stack
    expect(tasks).to.have.length(3)
    expect(tasks?.[0]).to.equal(taskA.task)
    expect(tasks?.[1]).to.equal(task1.task)
    expect(tasks?.[2]).to.equal(task0.task)

    // REVERSE THE ORDER!

    counter = 0
    const taskB = parallel('reversed', task3, task2, task1)
    const resultB = await taskB.task.run(new Run())

    expect(taskB.task.description).to.equal('reversed')
    expect(resultB.list().sort()).to.eql([
      { absolutePath: `${dir}/bar2.txt`, originalPath: `${dir}/bar2.txt` },
      { absolutePath: `${dir}/baz1.txt`, originalPath: `${dir}/baz1.txt` },
      { absolutePath: `${dir}/foo3.txt`, originalPath: `${dir}/foo3.txt` },
      { absolutePath: `${dir}/xxxx.txt`, originalPath: `${dir}/xxxx.txt` },
    ])

    // Always rooted in project path
    expect(resultB.directory).to.equal(getProjectDirectory())
    expect(resultB.get('xxxx.txt').contentsSync()).to.equal('first') // task1 is last

    // Tasks stack
    expect(tasks).to.have.length(3)
    expect(tasks?.[0]).to.equal(taskB.task)
    expect(tasks?.[1]).to.equal(task3.task)
    expect(tasks?.[2]).to.equal(task0.task)
  })
})
