// import { makeTestLog } from '../src/log'
import { TaskCall, Task } from '../src/task'
import { Plug } from '../src/plug'
import { expect } from 'chai'
import { AssertionError } from 'assert'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => void setTimeout(resolve, ms))
}

describe('Task', () => {
  describe('definition', () => {
    it('should create a Task', () => {
      let myFunction: TaskCall = (() => () => {})()
      expect(myFunction.name).to.equal('')

      // Anyonymous functions
      expect(new Task({ call: myFunction })).to.eql({
        call: myFunction,
        name: '',
      })

      expect(new Task({ name: 'theName', call: myFunction })).to.eql({
        call: myFunction,
        name: 'theName',
      })

      expect(new Task({ name: 'theName', description: 'theDescription', call: myFunction })).to.eql({
        call: myFunction,
        name: 'theName',
        description: 'theDescription',
      })

      // Named functions
      myFunction = () => {}
      expect(myFunction.name).to.equal('myFunction')

      expect(new Task({ call: myFunction })).to.eql({
        call: myFunction,
        name: 'myFunction',
      })

      expect(new Task({ name: 'theName', call: myFunction })).to.eql({
        call: myFunction,
        name: 'theName',
      })

      expect(new Task({ name: 'theName', description: 'theDescription', call: myFunction })).to.eql({
        call: myFunction,
        name: 'theName',
        description: 'theDescription',
      })

      expect(new Task({ name: '', call: myFunction })).to.eql({ // name explicitly set to an empty string
        call: myFunction,
        name: '',
      })

      // Named functions with an extra "description"
      myFunction.description = 'myDescription'

      expect(new Task({ call: myFunction })).to.eql({
        call: myFunction,
        name: 'myFunction',
        description: 'myDescription',
      })

      expect(new Task({ name: 'theName', call: myFunction })).to.eql({
        call: myFunction,
        name: 'theName',
        description: 'myDescription',
      })

      expect(new Task({ name: 'theName', description: 'theDescription', call: myFunction })).to.eql({
        call: myFunction,
        name: 'theName',
        description: 'theDescription',
      })

      expect(new Task({ name: '', description: '', call: myFunction })).to.eql({ // explicitly set both name and description to empty strings
        call: myFunction,
        name: '',
      })
    })

    // it('should not create a Task with the wrong parameters', () => {
    //   const plug = <any> new Plug()

    //   expect(() => plug.task()).to.throw(AssertionError, 'No arguments specified')
    //   expect(() => plug.task(false)).to.throw(AssertionError, 'Task call must be a function: boolean')
    //   expect(() => plug.task(false, () => {})).to.throw(AssertionError, 'Name must be a string: boolean')
    //   expect(() => plug.task('foo', false, () => {})).to.throw(AssertionError, 'Description must be a string: boolean')
    // })

    it('should include a task location', () => {
      expect(new Task({ call: () => {} }).location).to.eql('test/10-task.test.ts:96:13')
    })
  })

  // describe('importing', () => {
  //   it('should not allow duplicate named tasks', () => {
  //     const plug = new Plug()
  //     const call = (() => () => {})()

  //     // allow anonymous calls
  //     expect(plug.task(call)).to.eql({ call, name: '' })
  //     expect(plug.task(call)).to.eql({ call, name: '' })

  //     expect(plug.task('theName1', call)).to.eql({ call, name: 'theName1' })
  //     expect(plug.task('theName2', call)).to.eql({ call, name: 'theName2' })
  //     expect(() => plug.task('theName1', call)).to.throw(AssertionError,
  //       'Duplicate task with name "theName1"\n' +
  //       '  previously declared at: test/10-task.test.ts:109:18\n' +
  //       '  current declaration at: test/10-task.test.ts:111:24')
  //   })

  //   it('should not import anonymous tasks', () => {
  //     const plug = new Plug()
  //     const task = plug.task(() => {})
  //     expect(task.name).to.equal('')

  //     expect(() => plug.import(task)).to.throw(AssertionError,
  //     'Cowardly refusing to import an anonymous task\n' +
  //     '  declared at: test/10-task.test.ts:119:24')

  //     expect(() => plug.import(<any> { call: task.call, name: '' })).to.throw(AssertionError,
  //       'Cowardly refusing to import an anonymous task\n' +
  //       '  declared at: (unknown)')
  //   })

  //   it('should import tasks from another Plug instance', () => {
  //     const plug1 = new Plug()
  //     const task1 = plug1.task('foo', () => {})
  //     const task2 = plug1.task('bar', () => {})
  //     expect(plug1.tasks).to.eql([ task1, task2 ])

  //     const plug2 = new Plug()
  //     const task3 = plug2.task('baz', () => {})
  //     plug2.import(plug1)
  //     expect(plug2.tasks).to.eql([ task3, task1, task2 ])
  //   })

  //   it('should import functions as tasks', () => {
  //     const plug = new Plug()
  //     const task = () => {}
  //     expect(task.name).to.equal('task')

  //     plug.import(task)
  //     expect(plug.tasks).to.eql([ { name: 'task', call: task } ])

  //     expect(() => plug.import(task)).to.throw(AssertionError,
  //       'Duplicate task with name "task"\n' +
  //       '  previously declared at: test/10-task.test.ts:148:18\n' +
  //       '  current declaration at: test/10-task.test.ts:151:31')
  //   })

  //   it('should not import tasks with the wrong parameters', () => {
  //     const plug = new Plug()
  //     expect(() => plug.import(<any> true)).to.throw(AssertionError, 'Invalid type for task: boolean')
  //     expect(() => plug.import(<any> { name: true })).to.throw(AssertionError, 'Invalid type for task name: boolean')
  //     expect(() => plug.import(<any> { name: 'foo', call: true })).to.throw(AssertionError, 'Invalid type for task call: boolean')
  //   })
  // })

  // describe('parallel tasks', () => {
  //   it('should define a parallel task', () => {
  //     const plug = new Plug()
  //     const f = () => {}

  //     let t = plug.parallel([])
  //     // expect(t).to.be.a('function')
  //     expect(t).to.have.own.property('name', '<parallel>')
  //     expect(t).to.not.have.property('description')
  //     expect(t).to.have.own.property('subtasks').eql([ f ])

  //     t = plug.parallel('theName', [])
  //     // expect(t).to.be.a('function')
  //     expect(t).to.have.own.property('name', 'theName')
  //     expect(t).to.not.have.property('description')
  //     expect(t).to.have.own.property('subtasks').eql([])

  //     t = plug.parallel('theName', 'theDescription', [])
  //     expect(t).to.be.a('function')
  //     expect(t).to.have.own.property('name', 'theName')
  //     expect(t).to.have.own.property('description', 'theDescription')
  //     expect(t).to.have.own.property('subtasks').eql([])

  //     // expect(() => (<any> parallel)(123)).to.throw(AssertionError, 'First parameter must be a Task or name string')
  //     // expect(() => (<any> parallel)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
  //     // expect(() => (<any> parallel)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
  //     // expect(() => (<any> parallel)('name', 'desc')).to.throw(AssertionError, 'No tasks specified')
  //   })
  // })
})


//   it('should define a series task', () => {
//     const f = () => {}

//     let t = series(f)
//     expect(t).to.be.a('function')
//     expect(t).to.have.own.property('name', '<series>')
//     expect(t).to.not.have.property('description')
//     expect(t).to.have.own.property('subtasks').eql([ f ])

//     t = series('theName', f)
//     expect(t).to.be.a('function')
//     expect(t).to.have.own.property('name', 'theName')
//     expect(t).to.not.have.property('description')
//     expect(t).to.have.own.property('subtasks').eql([ f ])

//     t = series('theName', 'theDescription', f)
//     expect(t).to.be.a('function')
//     expect(t).to.have.own.property('name', 'theName')
//     expect(t).to.have.own.property('description', 'theDescription')
//     expect(t).to.have.own.property('subtasks').eql([ f ])

//     expect(() => (<any> series)(123)).to.throw(AssertionError, 'First parameter must be a Task or name string')
//     expect(() => (<any> series)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
//     expect(() => (<any> series)('name', 123)).to.throw(AssertionError, 'Second parameter must be a Task or description string')
//     expect(() => (<any> series)('name', 'desc')).to.throw(AssertionError, 'No tasks specified')
//   })

//   it('should run a few tasks in parallel', async () => {
//     const result: number[] = []
//     const now = Date.now()

//     const task = parallel(
//       async (context) => {
//         // expect(context.task).to.equal(task)
//         context.log('foo')

//         result.push(1)
//         await delay(30)
//         result.push(2)
//       },
//       async (context) => {
//         // expect(context.task).to.equal(task)
//         context.log('bar')

//         result.push(3)
//         await delay(20)
//         result.push(4)
//       },
//       async (context) => {
//         // expect(context.task).to.equal(task)
//         context.log('baz')

//         result.push(5)
//         await delay(10)
//         result.push(6)
//       })

//     const log = makeTestLog()

//     const context: TaskContext = { task, log } //: log.for('foo') }

//     await task(context)
//     expect(result).to.eql([ 1, 3, 5, 6, 4, 2 ])
//     expect(Date.now() - now).to.be.gte(30).lt(60)
//     expect(task.subtasks).to.have.length(3)

//     console.log(log.logs)
//   })

//   it('should run a few tasks in series', async () => {
//     const result: number[] = []
//     const now = Date.now()
//     const task = series(
//       async (context) => {
//         result.push(1)
//         await delay(30)
//         result.push(2)
//       },
//       async (context) => {
//         result.push(3)
//         await delay(20)
//         result.push(4)
//       },
//       async (context) => {
//         result.push(5)
//         await delay(10)
//         result.push(6)
//       })

//     await task(<any> null) // todo
//     expect(result).to.eql([ 1, 2, 3, 4, 5, 6 ])
//     expect(Date.now() - now).to.be.gte(60)
//     expect(task.subtasks).to.have.length(3)
//   })
