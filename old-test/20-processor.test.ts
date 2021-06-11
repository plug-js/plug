import { process } from '../src/processor'

import { Plug } from '../src/plug'

describe.skip('Process', () => {
  it('should run', async () => {
    // await process('test/tree/**/*')(<any> null) // todo
    const plug = new  Plug()

    function foo() {}

    plug.task(() => { })
    plug.task(foo)

  })

  // it('should run to', async () => {
  //   await process('test/tree/**/*').to('test/build')(<any> null) // todo
  // })

  // it('should run from', async () => {
  //   await process('**/*', { from: 'test/tree' })(<any> null) // todo
  // })

  // it('should run from and to', async () => {
  //   await process('**/*', { from: 'test/tree' }).to('test/build')(<any> null) // todo
  // })
})
