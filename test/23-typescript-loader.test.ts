import { expect } from 'chai'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { Failure } from '../src/failure'
import { loadBuildFile } from '../src/typescript/loader'

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
    expect(loadBuildFile(directory, 'javascript.js')).to.equal('from javascript')
    expect(loadBuildFile(directory, 'build.ts')).to.eql({
      foo: 'from included typescript',
      bar: 'from typescript',
    })
  })

  it('should fail when compilation fails', () => {
    expect(() => loadBuildFile(directory, 'bad-typescript.ts'))
        .to.throw(Failure, 'Error compiling build file')
  })

  it('should fail when compiler options are wrong', () => {
    expect(() => loadBuildFile(directory, 'bad-typescript.ts', 'bad-options.json'))
        .to.throw(Failure, 'Error in TypeScript configuration')
  })
})
