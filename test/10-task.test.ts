import { task, parallel, series } from '../src/task'
import { expect } from 'chai'
import { AssertionError } from 'assert'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => void setTimeout(resolve, ms))
}

describe('Task', () => {
  it('should define a task', () => {
    // Anyonymous functions
    let t = task(() => {})
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', '')
    expect(t).to.not.have.property('description')
    expect(t).to.not.have.property('subtasks')

    t = task('theName', () => {})
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.not.have.property('description')
    expect(t).to.not.have.property('subtasks')

    t = task('theName', 'theDescription', () => {})
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.have.own.property('description', 'theDescription')
    expect(t).to.not.have.property('subtasks')

    // Named functions
    const myFunction = () => {}
    expect(myFunction.name).to.equal('myFunction')

    t = task(myFunction)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'myFunction')
    expect(t).to.not.have.property('description')
    expect(t).to.not.have.property('subtasks')

    t = task('theName', myFunction)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.not.have.property('description')
    expect(t).to.not.have.property('subtasks')

    t = task('', myFunction) // explicitly set to an empty string
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', '')
    expect(t).to.not.have.property('description')
    expect(t).to.not.have.property('subtasks')

    t = task('theName', 'theDescription', myFunction)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.have.own.property('description', 'theDescription')
    expect(t).to.not.have.property('subtasks')

    // Named functions with an extra "description"
    myFunction.description = 'myDescription'

    t = task(myFunction)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'myFunction')
    expect(t).to.have.own.property('description', 'myDescription')
    expect(t).to.not.have.property('subtasks')

    t = task('theName', myFunction)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.have.own.property('description', 'myDescription')
    expect(t).to.not.have.property('subtasks')

    t = task('theName', 'theDescription', myFunction)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.have.own.property('description', 'theDescription')
    expect(t).to.not.have.property('subtasks')

    t = task('', '', myFunction) // explicitly set to empty strings
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', '')
    expect(t).to.not.have.property('description')
    expect(t).to.not.have.property('subtasks')

    // This should fail miserably, convert to <any> to avoid TS complaints
    expect(() => (<any> task)()).to.throw(AssertionError, 'No tasks specified')
  })

  it('should define a parallel task', () => {
    const f = () => {}

    let t = parallel(f)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', '')
    expect(t).to.not.have.property('description')
    expect(t).to.have.own.property('subtasks').eql([ f ])

    t = parallel('theName', f)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.not.have.property('description')
    expect(t).to.have.own.property('subtasks').eql([ f ])

    t = parallel('theName', 'theDescription', f)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.have.own.property('description', 'theDescription')
    expect(t).to.have.own.property('subtasks').eql([ f ])

    expect(() => (<any> parallel)(123)).to.throw(AssertionError, 'First parameter must be a Task or name string')
    expect(() => (<any> parallel)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
    expect(() => (<any> parallel)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
    expect(() => (<any> parallel)('name', 'desc')).to.throw(AssertionError, 'No tasks specified')
  })

  it('should define a series task', () => {
    const f = () => {}

    let t = series(f)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', '')
    expect(t).to.not.have.property('description')
    expect(t).to.have.own.property('subtasks').eql([ f ])

    t = series('theName', f)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.not.have.property('description')
    expect(t).to.have.own.property('subtasks').eql([ f ])

    t = series('theName', 'theDescription', f)
    expect(t).to.be.a('function')
    expect(t).to.have.own.property('name', 'theName')
    expect(t).to.have.own.property('description', 'theDescription')
    expect(t).to.have.own.property('subtasks').eql([ f ])

    expect(() => (<any> series)(123)).to.throw(AssertionError, 'First parameter must be a Task or name string')
    expect(() => (<any> series)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
    expect(() => (<any> series)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
    expect(() => (<any> series)('name', 'desc')).to.throw(AssertionError, 'No tasks specified')
  })

  it('should run a few tasks in parallel', async () => {
    const result: number[] = []
    const now = Date.now()
    const task = parallel(
      async () => {
        result.push(1)
        await delay(30)
        result.push(2)
      },
      async () => {
        result.push(3)
        await delay(20)
        result.push(4)
      },
      async () => {
        result.push(5)
        await delay(10)
        result.push(6)
      })

    await task()
    expect(result).to.eql([ 1, 3, 5, 6, 4, 2 ])
    expect(Date.now() - now).to.be.gte(30).lt(60)
    expect(task.subtasks).to.have.length(3)
  })

  it('should run a few tasks in series', async () => {
    const result: number[] = []
    const now = Date.now()
    const task = series(
      async () => {
        result.push(1)
        await delay(30)
        result.push(2)
      },
      async () => {
        result.push(3)
        await delay(20)
        result.push(4)
      },
      async () => {
        result.push(5)
        await delay(10)
        result.push(6)
      })

    await task()
    expect(result).to.eql([ 1, 2, 3, 4, 5, 6 ])
    expect(Date.now() - now).to.be.gte(60)
    expect(task.subtasks).to.have.length(3)
  })
})
