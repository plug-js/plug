import { AssertionError } from 'assert'
import { directory, disableLogs } from './support'
import { expect } from 'chai'
import fastGlob from 'fast-glob'
import { loadBuildFile, loadProject } from '../src/loader'

import { getParent, createFilePath, createDirectoryPath } from '../src/utils/paths'

describe('Project Loader', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  disableLogs()

  it('should load some basic build files', async () => {
    const javascript = createFilePath(directory, 'javascript.js')
    expect(await loadBuildFile(javascript)).to.equal('from javascript')

    const typescript = createFilePath(directory, 'typescript.ts')
    expect(await loadBuildFile(typescript)).to.eql({
      foo: 'from included typescript',
      bar: 'from typescript',
    })
  })

  it('should fail when compilation fails', async () => {
    const file = createFilePath(directory, 'bad-typescript.ts')
    await expect(loadBuildFile(file))
        .to.be.rejectedWith('Error compiling')
  })

  it('should load a project', async () => {
    const file = createFilePath(directory, 'build.ts')
    const project = await loadProject(file)

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
    const file = createFilePath(directory, 'build.ts')
    await expect(loadProject(file, createDirectoryPath(getParent(file), 'foo')))
        .to.be.rejectedWith(AssertionError, `Build file "${directory}/build.ts" not under "${directory}/foo"`)
  })
})
