import { expect } from 'chai'
import { ReportFailure } from '../src/failure'
import { loadBuildFile } from '../src/typescript/loader'
import { directory, mock } from './support'

describe('TypeScript Loader', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  const { project } = mock(directory)

  it('should load some basic build files', () => {
    expect(loadBuildFile(project, 'javascript.js')).to.equal('from javascript')
    expect(loadBuildFile(project, 'typescript.ts')).to.eql({
      foo: 'from included typescript',
      bar: 'from typescript',
    })
  })

  it('should fail when compilation fails', () => {
    expect(() => loadBuildFile(project, 'bad-typescript.ts'))
        .to.throw(ReportFailure, 'Error compiling')
  })
})
