import { ReportFailure } from '../src/failure'
import { createFilePath } from '../src/utils/paths'
import { directory } from './support'
import { expect } from 'chai'
import { loadBuildFile } from '../src/loader'

describe('TypeScript Loader', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

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
    await expect(loadBuildFile(file, directory))
        .to.be.rejectedWith(ReportFailure, 'Error compiling')
  })
})
