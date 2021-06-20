import { expect } from 'chai'
import { Files } from '../src/files'
import { PlugPipe, Processor, TaskPipe } from '../src/pipe'
import { getProjectDirectory } from '../src/project'
import { Run, Runnable } from '../src/run'
import { parallel, task } from '../src/task'

describe('Plug Tasks', () => {
  function init(run: Runnable['run']): TaskPipe {
    return new TaskPipe({ run })
  }

  it('should construct a task and run it once', async () => {
    let counter = 0

    const pipe = init(() => {
      counter ++
      return undefined as any
    })

    const task1 = task('test task', pipe)

    expect(task1).to.be.a('function')
    expect(task1.task).to.be.an('object')
    expect(task1.task.run).to.be.a('function')
    expect(task1.task.description).to.equal('test task')

    const run = new Run()

    // Initial run
    await task1.task.run(run)
    expect(counter).to.equal(1)

    // No run, cached output
    await task1.task.run(run)
    expect(counter).to.equal(1)

    // New "run", should run again
    await task1.task.run(new Run())
    expect(counter).to.equal(2)
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

    const files = new Files()
    const task0 = task(init(() => files))

    const task1 = task(() => task0().plug(pipe(async (input) => {
      await sleep(20) // finish last!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxxx.txt', { contents: 'first' })
      list.add(`foo${++ counter}.txt`)
      return list
    })))

    const task2 = task(() => task0().plug(pipe(async (input) => {
      await sleep(10) // finish in between!

      expect(input).to.equal(files)
      const list = input.clone()
      list.add('xxxx.txt', { contents: 'second' })
      list.add(`bar${++ counter}.txt`)
      return list
    })))

    const task3 = task(() => task0().plug(pipe((input) => {
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
  })
})
