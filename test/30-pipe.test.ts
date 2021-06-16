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
        .plug((input) => input + '...1' as any)
        .plug((input) => Promise.resolve(input + '...2' as any))
        .plug({ process: (input) => input + '...3' as any })
        .plug({ process: (input) => Promise.resolve(input + '...4' as any) })

    expect(await pipe.process('0' as any)).to.equal('0...1...2...3...4')
  })
})
