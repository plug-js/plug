import { load } from '../src/project'
import { getAbsolutePath } from '../src/utils/paths'
import { directory } from './support'

describe('Project', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  it('should load a project', () => {
    const file = getAbsolutePath(directory, 'build.ts')
    const project = load(file)
    console.log(project.getTaskDescriptions())
  })
})
