import { expect } from 'chai'
import { VirtualFileList } from '../src/files'
import { Pipe } from '../src/pipe'

describe('Plug Pipes', () => {
  it('should construct a simple pipeline', async () => {
    const list = new VirtualFileList('/foo')
    const pipe = Pipe.pipe()
    const result = await pipe.process(list)
    expect(result).to.equal(list)
  })

  it('should construct and run a multi-stage pipeline', async () => {
    const pipe = Pipe.pipe()

    const p1 = pipe.plug((input) => input + '...1' as any)
    expect(p1).to.equal(pipe)

    const p2 = pipe.plug((input) => Promise.resolve(input + '...2' as any))
    expect(p2).to.equal(pipe)

    expect(await pipe.process('0' as any)).to.equal('0...1...2')
  })
})
