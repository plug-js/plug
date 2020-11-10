import { Plug } from '../src/plug'
import { Task, TaskCall, ParallelTask, SeriesTask } from '../src/task'

import { expect } from 'chai'
import { AssertionError } from 'assert'

describe('Plug', () => {
  it('should include a task location', () => {
    expect(new Plug().task(() => {}).location).to.eql('test/11-plug.test.ts:9:22')
  })

  it('should create a Task from an anonymous function', () => {
    const myFunction = (() => () => {})()
    expect(myFunction.name).to.equal('')

    let plug = new Plug()
    let task = plug.task(myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
    })
    expect(plug.tasks).to.eql([])


    plug = new Plug()
    task = plug.task('overrideName', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
    })
    expect(plug.tasks).to.eql([ task ])


    plug = new Plug()
    task = plug.task('overrideName', 'theDescription', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
      description: 'theDescription',
    })
    expect(plug.tasks).to.eql([ task ])


    plug = new Plug()
    task = plug.task('', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
    })
    expect(plug.tasks).to.eql([])


    plug = new Plug()
    task = plug.task('', '', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
    })
    expect(plug.tasks).to.eql([])
  })

  it('should create a Task from a named function', () => {
    const myFunction = () => {}
    expect(myFunction.name).to.equal('myFunction')

    let plug = new Plug()
    let task = plug.task(myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'myFunction',
    })
    expect(plug.tasks).to.eql([ task ])


    plug = new Plug()
    task = plug.task('overrideName', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
    })
    expect(plug.tasks).to.eql([ task ])


    plug = new Plug()
    task = plug.task('overrideName', 'theDescription', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
      description: 'theDescription',
    })
    expect(plug.tasks).to.eql([ task ])


    plug = new Plug()
    task = plug.task('', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
    })
    expect(plug.tasks).to.eql([])

    plug = new Plug()
    task = plug.task('', '', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
    })
    expect(plug.tasks).to.eql([])
  })

  it('should create a Task from an anonymous TaskCall', () => {
    const myFunction: TaskCall = (() => () => {})()
    expect(myFunction.name).to.equal('')
    myFunction.description = 'functionDescription'

    let plug = new Plug()
    let task = plug.task(myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
      description: 'functionDescription',
    })
    expect(plug.tasks).to.eql([])


    plug = new Plug()
    task = plug.task('overrideName', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
      description: 'functionDescription',
    })
    expect(plug.tasks).to.eql([ task ])


    plug = new Plug()
    task = plug.task('overrideName', 'theDescription', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
      description: 'theDescription',
    })
    expect(plug.tasks).to.eql([ task ])


    plug = new Plug()
    task = plug.task('', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
      description: 'functionDescription',
    })
    expect(plug.tasks).to.eql([])


    plug = new Plug()
    task = plug.task('', '', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
    })
    expect(plug.tasks).to.eql([])
  })

  it('should create a Task from a named TaskCall', () => {
    const myFunction: TaskCall = () => {}
    expect(myFunction.name).to.equal('myFunction')
    myFunction.description = 'functionDescription'

    let plug = new Plug()
    let task = plug.task(myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'myFunction',
      description: 'functionDescription',
    })


    plug = new Plug()
    task = plug.task('overrideName', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
      description: 'functionDescription',
    })


    plug = new Plug()
    task = plug.task('overrideName', 'theDescription', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: 'overrideName',
      description: 'theDescription',
    })


    plug = new Plug()
    task = plug.task('', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
      description: 'functionDescription',
    })


    plug = new Plug()
    task = plug.task('', '', myFunction)
    expect(task).to.be.instanceOf(Task).and.to.eql({
      name: '',
    })
})

  it('should not create a Task with the wrong parameters', () => {
    expect(() => new (<any> Plug)().task({})).to.throw(AssertionError, 'Task must be constructed with a "call" option or override the "call" method')
    expect(() => new (<any> Plug)().task('foo')).to.throw(AssertionError, 'Task must be constructed with a "call" option or override the "call" method')
    expect(() => new (<any> Plug)().task({ call: 'foo' })).to.throw(AssertionError, 'Property "call" is not a "TaskCall" function (was: string)')
    expect(() => new (<any> Plug)().task({ call: () => {}, name: true })).to.throw(AssertionError, 'Property "name" is not a string (was: boolean)')
    expect(() => new (<any> Plug)().task({ call: () => {}, description: true })).to.throw(AssertionError, 'Property "description" is not a string (was: boolean)')
  })

  it('should define a parallel task', () => {
    let plug = new Plug()
    let task = plug.parallel([])
    expect(task).to.be.instanceOf(ParallelTask).and.to.eql({
      name: '',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([])

    plug = new Plug()
    task = plug.parallel('theName', [])
    expect(task).to.be.instanceOf(ParallelTask).and.to.eql({
      name: 'theName',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])

    plug = new Plug()
    task = plug.parallel('theName', 'theDescription', [])
    expect(task).to.be.instanceOf(ParallelTask).and.to.eql({
      name: 'theName',
      description: 'theDescription',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])

    plug = new Plug()
    task = (<any> plug).parallel()
    expect(task).to.be.instanceOf(ParallelTask).and.to.eql({
      name: '',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([])

    plug = new Plug()
    task = (<any> plug).parallel('theName')
    expect(task).to.be.instanceOf(ParallelTask).and.to.eql({
      name: 'theName',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])

    plug = new Plug()
    task = (<any> plug).parallel('theName', 'theDescription')
    expect(task).to.be.instanceOf(ParallelTask).and.to.eql({
      name: 'theName',
      description: 'theDescription',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])
  })

  it('should define a parallel task with subtasks', () => {
    const plug = new Plug()

    const taskCall: TaskCall = () => {}
    const otherTask = new Task('otherTask', () => {}) // not imported
    const namedTask = plug.task('namedTask', () => {}) // imported

    expect(plug.tasks).to.eql([ namedTask ])

    const parallelTask = plug.parallel('parallelTask', [ taskCall, otherTask, 'namedTask' ])

    expect(plug.tasks).to.eql([ namedTask, parallelTask ])

    expect(parallelTask.subtasks).to.eql([
      { name: 'taskCall' }, otherTask, namedTask,
    ])

    expect(() => plug.parallel([ 'missingTask' ])).to.throw(AssertionError, 'Unknown task "missingTask')
  })

  it('should define a series task', () => {
    let plug = new Plug()
    let task = plug.series([])
    expect(task).to.be.instanceOf(SeriesTask).and.to.eql({
      name: '',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([])

    plug = new Plug()
    task = plug.series('theName', [])
    expect(task).to.be.instanceOf(SeriesTask).and.to.eql({
      name: 'theName',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])

    plug = new Plug()
    task = plug.series('theName', 'theDescription', [])
    expect(task).to.be.instanceOf(SeriesTask).and.to.eql({
      name: 'theName',
      description: 'theDescription',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])

    plug = new Plug()
    task = (<any> plug).series()
    expect(task).to.be.instanceOf(SeriesTask).and.to.eql({
      name: '',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([])

    plug = new Plug()
    task = (<any> plug).series('theName')
    expect(task).to.be.instanceOf(SeriesTask).and.to.eql({
      name: 'theName',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])

    plug = new Plug()
    task = (<any> plug).series('theName', 'theDescription')
    expect(task).to.be.instanceOf(SeriesTask).and.to.eql({
      name: 'theName',
      description: 'theDescription',
      subtasks: [],
    })
    expect(plug.tasks).to.eql([ task ])
  })

  it('should define a series task with subtasks', () => {
    const plug = new Plug()

    const taskCall: TaskCall = () => {}
    const otherTask = new Task('otherTask', () => {}) // not imported
    const namedTask = plug.task('namedTask', () => {}) // imported

    expect(plug.tasks).to.eql([ namedTask ])

    const seriesTask = plug.series('seriesTask', [ taskCall, otherTask, 'namedTask' ])

    expect(plug.tasks).to.eql([ namedTask, seriesTask ])

    expect(seriesTask.subtasks).to.eql([
      { name: 'taskCall' }, otherTask, namedTask,
    ])

    expect(() => plug.series([ 'missingTask' ])).to.throw(AssertionError, 'Unknown task "missingTask"')
  })

  it('should not import two tasks with the same name', () => {
    const t1 = new Task('foo', () => {})
    const t2 = new Task('bar', () => {})
    const t3 = new Task('foo', () => {})

    const plug = new Plug()

    plug.import(t1, t2)
    expect(plug.tasks).to.eql([ t1, t2 ])

    plug.import(t1, t2)
    expect(plug.tasks).to.eql([ t1, t2 ])

    expect(() => plug.import(t3)).to.throw(AssertionError,
      'Duplicate task with name "foo"\n' +
      '  previously declared at: test/11-plug.test.ts:347:15\n' +
      '  current declaration at: test/11-plug.test.ts:349:15')
  })
})
