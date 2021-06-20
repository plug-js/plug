import { expect } from 'chai'
import { ReportFailure } from '../src/failure'
import { loadBuildFile } from '../src/typescript/loader'
import { directory } from './support'

describe('TypeScript Loader', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  it('should load some basic build files', () => {
    expect(loadBuildFile(directory, 'javascript.js')).to.equal('from javascript')
    expect(loadBuildFile(directory, 'typescript.ts')).to.eql({
      foo: 'from included typescript',
      bar: 'from typescript',
    })
  })

  it('should fail when compilation fails', () => {
    expect(() => loadBuildFile(directory, 'bad-typescript.ts'))
        .to.throw(ReportFailure, 'Error compiling')
  })
})
