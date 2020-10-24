import { process } from '../src/processor'

describe('Process', () => {
  it('should run', async () => {
    await process('test/tree/**/*')(<any> null) // todo
  })

  it('should run to', async () => {
    await process('test/tree/**/*').to('test/build')(<any> null) // todo
  })

  it('should run from', async () => {
    await process('**/*', { from: 'test/tree' })(<any> null) // todo
  })

  it('should run from and to', async () => {
    await process('**/*', { from: 'test/tree' }).to('test/build')(<any> null) // todo
  })
})
