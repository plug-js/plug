import { AssertionError } from 'assert'
import { directory } from './support'
import { expect } from 'chai'
import fastGlob from 'fast-glob'
import { load } from '../src/project'

import { RelativeDirectoryPath, RelativeFilePath, getParent, resolvePath } from '../src/utils/paths'

describe('Project Loading', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  it('should load a project', async () => {
    const file = resolvePath(directory, 'build.ts' as RelativeFilePath)
    const project = await load(file)

    expect(project.directory).to.equal(directory)
    expect(project.buildFile).to.equal(file)

    expect(project.getTaskNames().sort()).to.eql([ 'default' ])
    expect(project.getTaskDescriptions()).to.eql({
      default: '... the default ...',
    })

    const call = project.getTask('default')
    expect(call).be.an('object')

    expect(project.getTaskName(call!)).to.equal('default')

    expect(call?.description).to.equal('... the default ...')
    expect(call?.run).to.equal(fastGlob)
  })

  it('should not load a project outside of its directory', async () => {
    const file = resolvePath(directory, 'build.ts' as RelativeFilePath)
    await expect(load(file, resolvePath(getParent(file), 'foo' as RelativeDirectoryPath)))
        .to.be.rejectedWith(AssertionError, `Build file "${directory}/build.ts" not under "${directory}/foo"`)
  })
})
