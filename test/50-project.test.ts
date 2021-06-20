import { AssertionError } from 'assert'
import { expect } from 'chai'
import { Failure } from '../src/failure'
import { load, Project } from '../src/project'
import { DirectoryPath, getAbsolutePath, getDirectoryPath, getParentDirectory } from '../src/utils/paths'
import { directory, disableLogs } from './support'

describe('Project', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  disableLogs()

  it('should load a project', () => {
    // theeeheee!!! this will recompile our entire source code!
    const file = getAbsolutePath(directory, 'build.ts')
    const project = load(file)

    expect(project.directory).to.equal(directory)
    expect(project.buildFile).to.equal(file)

    expect(project.getTaskNames().sort()).to.eql([ 'default', 'task1', 'task2' ])
    expect(project.getTaskDescriptions()).to.eql({
      default: '... the default ...',
      task1: '... a description ...',
      task2: undefined,
    })

    const task0 = project.getTask('default')
    const task1 = project.getTask('task1')
    const task2 = project.getTask('task2')
    expect(task0).be.an('object').with.property('description', '... the default ...')
    expect(task1).be.an('object').with.property('description', '... a description ...')
    expect(task2).be.an('object')

    expect(project.getTaskName(task0!)).to.equal('default')
    expect(project.getTaskName(task1!)).to.equal('task1')
    expect(project.getTaskName(task2!)).to.equal('task2')
    expect(project.getTaskName({} as any)).to.equal('unknown')
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

  it('should not load a project outside of its directory', () => {
    const file = getAbsolutePath(directory, 'build.ts')
    expect(() => load(file, getDirectoryPath(getParentDirectory(file), 'foo')))
        .to.throw(AssertionError, `Refusing to add file "${directory}/build.ts" to "${directory}/foo"`)
  })

  it('should not create a project with silly input', () => {
    const dir = '/foo' as DirectoryPath
    const file = getAbsolutePath(dir, 'build.ts')

    expect(() => new Project(null as any, file, dir)).to.throw(Failure, 'Build file "/foo/build.ts" has no exports')
    expect(() => new Project('xx' as any, file, dir)).to.throw(Failure, 'Build file "/foo/build.ts" has no exports')
  })
})
