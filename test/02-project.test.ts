import { AssertionError } from 'assert'
import { Project } from '../src/project'
import { disableLogs } from './support'
import { expect } from 'chai'
import { createFilePath, DirectoryPath, FilePath } from '../src/utils/paths'

describe('Project', () => {
  disableLogs()

  it('should create a project', () => {
    const dir = '/foo' as DirectoryPath
    const file1 = createFilePath(dir, 'build.ts')
    const file2 = createFilePath(dir, 'bar/build.ts')

    const project1 = new Project({}, file1)
    expect(project1.directory).to.equal('/foo')
    expect(project1.buildFile).to.equal('/foo/build.ts')

    const project2 = new Project({}, file2)
    expect(project2.directory).to.equal('/foo/bar')
    expect(project2.buildFile).to.equal('/foo/bar/build.ts')

    const project3 = new Project({}, file2, dir)
    expect(project3.directory).to.equal('/foo')
    expect(project3.buildFile).to.equal('/foo/bar/build.ts')
  })

  it('should register and return a task name', async () => {
    const dir = '/foo' as DirectoryPath
    const file = createFilePath(dir, 'build.ts')

    const task0: any = { run: () => 0 }
    const task1: any = { run: () => 1, description: 'First task' }
    const task2: any = { run: () => 2, description: 'Second task' }
    const call2: any = () => {}
    call2.task = task2

    const project = new Project({
      task0: task0,
      task1: task1,
      task2: call2,
    }, file)

    expect(project.directory).to.equal(dir)

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

    expect(await project.runTask('task0')).to.equal(0)
    expect(await project.runTask('task1')).to.equal(1)
    expect(await project.runTask('task2')).to.equal(2)
    await expect(project.runTask()).to.be.rejectedWith('No such task "default"')
  })

  it('should cleanup what it can reading a project', () => {
    const dir = '/foo' as DirectoryPath
    const file = createFilePath(dir, 'build.ts')
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
    const file = createFilePath(dir, 'build.ts')

    expect(() => new Project(null as any, file, dir)).to.throw(Error, 'Build file "/foo/build.ts" has no exports')
    expect(() => new Project('xx' as any, file, dir)).to.throw(Error, 'Build file "/foo/build.ts" has no exports')
    expect(() => new Project(null as any, 'foo' as FilePath))
        .to.throw(AssertionError, 'Not an absolute build file: "foo"')
    expect(() => new Project(null as any, file, 'foo' as DirectoryPath))
        .to.throw(AssertionError, 'Not an absolute directory: "foo"')
    expect(() => new Project(null as any, file, '/bar' as DirectoryPath))
        .to.throw(AssertionError, 'Build file "/foo/build.ts" not under "/bar"')
  })
})
