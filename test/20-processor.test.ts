import { process } from '../src/processor'

describe('Process', () => {
  it('should run', async () => {
    await process('./*/*')
      // .with(typescript())
      // .with(eslint())
      // .with(sourcemaps())
      .to('build')()
  })
})
