import { expect } from 'chai'
import { Failure } from '../src/failure'
import { Project } from '../src/project'
import { DirectoryPath, getAbsolutePath } from '../src/utils/paths'
import { disableLogs } from './support'

describe('Project', () => {
  disableLogs()

  it('should register and return a task name', () => {
    const dir = '/foo' as DirectoryPath
    const file = getAbsolutePath(dir, 'build.ts')

    const task0: any = { run: () => {} }
    const task1: any = { run: () => {}, description: 'First task' }
    const task2: any = { run: () => {}, description: 'Second task' }
    const call2: any = () => {}
    call2.task = task2

    const project = new Project({
      task0: task0,
      task1: task1,
      task2: call2,
    }, file, dir)

    expect(project.getTask('task0')).to.equal(task0)
    expect(project.getTask('task1')).to.equal(task1)
    expect(project.getTask('task2')).to.equal(task2)

    expect(project.getTaskName(task0)).to.equal('task0')
    expect(project.getTaskName(task1)).to.equal('task1')
    expect(project.getTaskName(task2)).to.equal('task2')

    expect(project.getTaskName({} as any)).to.equal('unknown')

    expect(project.getTaskNames().sort()).to.eql([ 'task0', 'task1', 'task2' ])

    expect(project.getTaskDescriptions()).to.eql({
      task0: undefined,
      task1: 'First task',
      task2: 'Second task',
    })
  })

  it('should cleanup what it can reading a project', () => {
    const dir = '/foo' as DirectoryPath
    const file = getAbsolutePath(dir, 'build.ts')
    const task = { run: () => {} }

    const project = new Project({
      'wrong_type': 'ignore me',
      'plain_task': task,
      'null_task': null,
      '': 'empty string',
    } as any, file, dir)

    expect(project.getTaskNames()).to.eql([ 'plain_task' ])
    expect(project.getTask('plain_task')).to.equal(task)
  })

  it('should not create a project with silly input', () => {
    const dir = '/foo' as DirectoryPath
    const file = getAbsolutePath(dir, 'build.ts')

    expect(() => new Project(null as any, file, dir)).to.throw(Failure, 'Build file "/foo/build.ts" has no exports')
    expect(() => new Project('xx' as any, file, dir)).to.throw(Failure, 'Build file "/foo/build.ts" has no exports')
  })
})
