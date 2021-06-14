import { expect } from 'chai'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { Failure } from '../src/failure'
import { loadBuildFile } from '../src/typescript/loader'
import { VirtualFileSystem } from '../src/virtual-file-system'

function findDirectory(directory: string): string {
  if (existsSync(resolve(directory, 'package.json'))) return directory
  const parent = dirname(directory)
  if (directory === parent) throw new Error('File "package.json" not found')
  return findDirectory(parent)
}

// This directory _may_ be relocated under build, so find it...
const directory = resolve(findDirectory(__dirname), 'test', 'support')

describe('TypeScript Loader', () => {
  it('should load some basic build files', () => {
    const fileSystem = new VirtualFileSystem(directory)

    expect(loadBuildFile(fileSystem, 'javascript.js')).to.equal('from javascript')
    expect(loadBuildFile(fileSystem, 'build.ts')).to.eql({
      foo: 'from included typescript',
      bar: 'from typescript',
    })
  })

  it('should fail when compilation fails', () => {
    const fileSystem = new VirtualFileSystem(directory)
    expect(() => loadBuildFile(fileSystem, 'bad-typescript.ts'))
        .to.throw(Failure, 'Error compiling build file')
  })

  it('should fail when compiler options are wrong', () => {
    const fileSystem = new VirtualFileSystem(directory)
    expect(() => loadBuildFile(fileSystem, 'bad-typescript.ts', 'bad-options.json'))
        .to.throw(Failure, 'Error in TypeScript configuration')
  })
})
