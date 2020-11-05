import { Task, TaskCall, ParallelTask, SeriesTask } from '../src/task'
import { expect } from 'chai'
import { AssertionError } from 'assert'

import log from '../src/log'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => void setTimeout(resolve, ms))
}

describe('Task', () => {
  describe('creation', () => {
    it('should include a task location', () => {
      expect(new Task({ call: () => {} }).location).to.eql('test/10-task.test.ts:14:13')
    })

    it('should create a Task from an anonymous function', () => {
      const myFunction = (() => () => {})()
      expect(myFunction.name).to.equal('')

      // without options

      expect(new Task(myFunction)).to.eql({
        name: '',
      })

      expect(new Task('overrideName', myFunction)).to.eql({
        name: 'overrideName',
      })

      expect(new Task('overrideName', 'theDescription', myFunction)).to.eql({
        name: 'overrideName',
        description: 'theDescription',
      })

      expect(new Task('', myFunction)).to.eql({
        name: '',
      })

      expect(new Task('', '', myFunction)).to.eql({
        name: '',
      })

      // with options

      expect(new Task({ call: myFunction })).to.eql({
        name: '',
      })

      expect(new Task({ name: 'overrideName', call: myFunction })).to.eql({
        name: 'overrideName',
      })

      expect(new Task({ name: 'overrideName', description: 'theDescription', call: myFunction })).to.eql({
        name: 'overrideName',
        description: 'theDescription',
      })

      expect(new Task({ name: '', call: myFunction })).to.eql({
        name: '',
      })

      expect(new Task({ name: '', description: '', call: myFunction })).to.eql({
        name: '',
      })
    })

    it('should create a Task from a named function', () => {
      const myFunction = () => {}
      expect(myFunction.name).to.equal('myFunction')

      // without options

      expect(new Task(myFunction)).to.eql({
        name: 'myFunction',
      })

      expect(new Task('overrideName', myFunction)).to.eql({
        name: 'overrideName',
      })

      expect(new Task('overrideName', 'theDescription', myFunction)).to.eql({
        name: 'overrideName',
        description: 'theDescription',
      })

      expect(new Task('', myFunction)).to.eql({
        name: '',
      })

      expect(new Task('', '', myFunction)).to.eql({
        name: '',
      })

      // with options

      expect(new Task({ call: myFunction })).to.eql({
        name: 'myFunction',
      })

      expect(new Task({ name: 'overrideName', call: myFunction })).to.eql({
        name: 'overrideName',
      })

      expect(new Task({ name: 'overrideName', description: 'theDescription', call: myFunction })).to.eql({
        name: 'overrideName',
        description: 'theDescription',
      })

      expect(new Task({ name: '', call: myFunction })).to.eql({
        name: '',
      })

      expect(new Task({ name: '', description: '', call: myFunction })).to.eql({
        name: '',
      })
    })

    it('should create a Task from an anonymous TaskCall', () => {
      const myFunction: TaskCall = (() => () => {})()
      expect(myFunction.name).to.equal('')
      myFunction.description = 'functionDescription'

      // without options

      expect(new Task(myFunction)).to.eql({
        name: '',
        description: 'functionDescription',
      })

      expect(new Task('overrideName', myFunction)).to.eql({
        name: 'overrideName',
        description: 'functionDescription',
      })

      expect(new Task('overrideName', 'theDescription', myFunction)).to.eql({
        name: 'overrideName',
        description: 'theDescription',
      })

      expect(new Task('', myFunction)).to.eql({
        name: '',
        description: 'functionDescription',
      })

      expect(new Task('', '', myFunction)).to.eql({
        name: '',
      })

      // with options

      expect(new Task({ call: myFunction })).to.eql({
        name: '',
        description: 'functionDescription',
      })

      expect(new Task({ name: 'overrideName', call: myFunction })).to.eql({
        name: 'overrideName',
        description: 'functionDescription',
      })

      expect(new Task({ name: 'overrideName', description: 'theDescription', call: myFunction })).to.eql({
        name: 'overrideName',
        description: 'theDescription',
      })

      expect(new Task({ name: '', call: myFunction })).to.eql({
        name: '',
        description: 'functionDescription',
      })

      expect(new Task({ name: '', description: '', call: myFunction })).to.eql({
        name: '',
      })
    })

    it('should create a Task from a named TaskCall', () => {
      const myFunction: TaskCall = () => {}
      expect(myFunction.name).to.equal('myFunction')
      myFunction.description = 'functionDescription'

      expect(new Task({ call: myFunction })).to.eql({
        name: 'myFunction',
        description: 'functionDescription',
      })

      expect(new Task({ name: 'overrideName', call: myFunction })).to.eql({
        name: 'overrideName',
        description: 'functionDescription',
      })

      expect(new Task({ name: 'overrideName', description: 'theDescription', call: myFunction })).to.eql({
        name: 'overrideName',
        description: 'theDescription',
      })

      expect(new Task({ name: '', call: myFunction })).to.eql({
        name: '',
        description: 'functionDescription',
      })

      expect(new Task({ name: '', description: '', call: myFunction })).to.eql({
        name: '',
      })
    })

    it('should create a task overriding the "call" method', () => {
      const result: any[] = []

      class MyTask extends Task {
        async call(...args: any[]) {
          result.push(this, ...args)
        }
      }

      const task = new MyTask()
      expect(task).to.be.instanceOf(Task)
      expect(task).to.be.instanceOf(MyTask)

      task.call('foo', 'bar', 'baz')
      expect(result).to.eql([ task, 'foo', 'bar', 'baz' ])
    })

    it('should correctly include a "log"', () => {
      const task = new Task({ name: 'loggable', call: () => {} })
      expect(task.log).to.be.a('function')
      expect(task.log.debug).to.be.a('function')
      expect(task.log.alert).to.be.a('function')
      expect(task.log.error).to.be.a('function')
    })

    it('should not create a Task with the wrong parameters', () => {
      expect(() => new (<any> Task)({})).to.throw(AssertionError, 'Task must be constructed with a "call" option or override the "call" method')
      expect(() => new (<any> Task)('foo')).to.throw(AssertionError, 'Task must be constructed with a "call" option or override the "call" method')
      expect(() => new (<any> Task)({ call: 'foo' })).to.throw(AssertionError, 'Property "call" is not a "TaskCall" function (was: string)')
      expect(() => new (<any> Task)({ call: () => {}, name: true })).to.throw(AssertionError, 'Property "name" is not a string (was: boolean)')
      expect(() => new (<any> Task)({ call: () => {}, description: true })).to.throw(AssertionError, 'Property "description" is not a string (was: boolean)')
    })
  })

  describe('invocation', () => {
    it('should correctly invoke a successful task', async () => {
      const result: any[] = [] // will contain [ this, context ]

      const task = new Task({ call: function(...args: any[]) {
        result.push(this, ...args)
        return <void> <unknown> 'foobar'
      } })

      const promise = (<any> task.call)('foo', 'bar')
      expect(promise).to.be.instanceOf(Promise)
      expect(await promise).to.be.undefined

      expect(result).to.have.length(2)
      expect(result[0]).to.equal(task)
      expect(result[1].task).to.equal(task)
      expect(result[1].log).to.be.a('function').with.property('name', 'log')
    })

    it('should correctly invoke a failing task', async () => {
      const result: any[] = [] // will contain [ this, context ]

      const task = new Task({ call: function(...args: any[]) {
        result.push(this, ...args)
        throw 'foobar'
      } })

      const promise = (<any> task.call)('foo', 'bar')
      expect(promise).to.be.instanceOf(Promise)
      await expect(promise).to.be.rejectedWith('foobar')

      expect(result).to.have.length(2)
      expect(result[0]).to.equal(task)
      expect(result[1].task).to.equal(task)
      expect(result[1].log).to.be.a('function').with.property('name', 'log')
    })
  })

  describe('parallel tasks', () => {
    it('should define a parallel task', () => {
      expect(new ParallelTask()).to.eql({
        name: '',
        subtasks: [],
      })

      expect(new ParallelTask([])).to.eql({
        name: '',
        subtasks: [],
      })

      expect(new ParallelTask('theName', [])).to.eql({
        name: 'theName',
        subtasks: [],
      })

      expect(new ParallelTask('theName', 'theDescription', [])).to.eql({
        name: 'theName',
        description: 'theDescription',
        subtasks: [],
      })

      expect(new ParallelTask({ subtasks: [] })).to.eql({
        name: '',
        subtasks: [],
      })

      expect(new ParallelTask({ name: 'theName', subtasks: [] })).to.eql({
        name: 'theName',
        subtasks: [],
      })

      expect(new ParallelTask({ name: 'theName', description: 'theDescription', subtasks: [] })).to.eql({
        name: 'theName',
        description: 'theDescription',
        subtasks: [],
      })

      expect(new (<any> ParallelTask)('theName')).to.eql({
        name: 'theName',
        subtasks: [],
      })
    })

    it('should run a few tasks in parallel', async () => {
      const result: number[] = []
      const now = Date.now()

      const t1 = new Task({ name: 'foo', call: async (context) => {
        result.push(1)
        await delay(30)
        result.push(2)
      } })

      const t2 = new Task({ name: 'bar', call: async (context) => {
        result.push(3)
        await delay(20)
        result.push(4)
      } })

      const t3 = new Task({ name: 'baz', call: async (context) => {
        result.push(5)
        await delay(10)
        result.push(6)
      } })

      const t = new ParallelTask({ subtasks: [ t1, t2, t3 ]})
      expect(t).to.eql({
        name: '',
        subtasks: [ t1, t2, t3 ],
      })

      await t.call()

      expect(result).to.eql([ 1, 3, 5, 6, 4, 2 ])
      expect(Date.now() - now).to.be.gte(30).lt(60)
    })
  })

  describe('series tasks', () => {
    it('should define a series task', () => {
      expect(new SeriesTask()).to.eql({
        name: '',
        subtasks: [],
      })

      expect(new SeriesTask([])).to.eql({
        name: '',
        subtasks: [],
      })

      expect(new SeriesTask('theName', [])).to.eql({
        name: 'theName',
        subtasks: [],
      })

      expect(new SeriesTask('theName', 'theDescription', [])).to.eql({
        name: 'theName',
        description: 'theDescription',
        subtasks: [],
      })

      expect(new SeriesTask({ subtasks: [] })).to.eql({
        name: '',
        subtasks: [],
      })

      expect(new SeriesTask({ name: 'theName', subtasks: [] })).to.eql({
        name: 'theName',
        subtasks: [],
      })

      expect(new SeriesTask({ name: 'theName', description: 'theDescription', subtasks: [] })).to.eql({
        name: 'theName',
        description: 'theDescription',
        subtasks: [],
      })

      expect(new (<any> SeriesTask)('theName')).to.eql({
        name: 'theName',
        subtasks: [],
      })
    })

    it('should run a few tasks in series', async () => {
      const result: number[] = []
      const now = Date.now()

      const t1 = new Task({ name: 'foo', call: async (context) => {
        result.push(1)
        await delay(30)
        result.push(2)
      } })

      const t2 = new Task({ name: 'bar', call: async (context) => {
        result.push(3)
        await delay(20)
        result.push(4)
      } })

      const t3 = new Task({ name: 'baz', call: async (context) => {
        result.push(5)
        await delay(10)
        result.push(6)
      } })

      const t = new SeriesTask({ subtasks: [ t1, t2, t3 ]})
      expect(t).to.eql({
        name: '',
        subtasks: [ t1, t2, t3 ],
      })

      await t.call()

      expect(result).to.eql([ 1, 2, 3, 4, 5, 6 ])
      expect(Date.now() - now).to.be.gte(60)
    })
  })
})
