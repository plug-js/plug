import { loadBuildFile } from '../src/typescript/loader'
import { directory } from './support'

describe('Project', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  it('should load a project', () => {
    console.log(loadBuildFile(directory, 'build.ts'))
  })
})
