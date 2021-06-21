import { AssertionError } from 'assert'
import { expect } from 'chai'
import { load } from '../src/project'
import { resolvePath, getParent, RelativeDirectoryPath, RelativeFilePath } from '../src/utils/paths'
import { directory } from './support'

describe('Project Loading', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  it('should load a project', () => {
    // theeeheee!!! this will recompile our entire source code!
    const file = resolvePath(directory, 'build.ts' as RelativeFilePath)
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

  it('should not load a project outside of its directory', () => {
    const file = resolvePath(directory, 'build.ts' as RelativeFilePath)
    expect(() => load(file, resolvePath(getParent(file), 'foo' as RelativeDirectoryPath)))
        .to.throw(AssertionError, `Build file "${directory}/build.ts" not under "${directory}/foo"`)
  })
})
