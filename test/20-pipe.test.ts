import { expect } from 'chai'
import { Files } from '../src/files'
import { PlugPipe, TaskPipe } from '../src/pipe'
import { DirectoryPath } from '../src/utils/paths'

describe('Plug Pipes', () => {
  it('should construct a simple pipeline', async () => {
    const list = new Files('/foo' as DirectoryPath)
    const pipe = new PlugPipe()
    const result = await pipe.process(list, null as any)
    expect(result).to.equal(list)
  })

  it('should construct and run a multi-stage pipeline', async () => {
    const pipeline = new PlugPipe()
        .plug((input) => input + '...1' as any)
        .plug((input) => Promise.resolve(input + '...2' as any))
        .plug({ process: (input) => input + '...3' as any })
        .plug({ process: (input) => Promise.resolve(input + '...4' as any) })

    expect(await pipeline.process('0' as any, null as any)).to.equal('0...1...2...3...4')
  })

  it('should construct and run a task pipeline', async () => {
    const pipeline = new TaskPipe({ run: () => 0 as any })
        .plug((input) => input + '...1' as any)
        .plug((input) => Promise.resolve(input + '...2' as any))
        .plug({ process: (input) => input + '...3' as any })
        .plug({ process: (input) => Promise.resolve(input + '...4' as any) })

    expect(await pipeline.run({} as any)).to.equal('0...1...2...3...4')
  })

  it('should throw when an element of the pipe fails', async () => {
    const p1 = new PlugPipe().plug(() => {
      throw new Error('foo')
    }).process(new Files('/foo' as DirectoryPath), {} as any)
    await expect(p1).to.be.rejectedWith(Error, 'foo')

    const p2 = new TaskPipe({ run: () => null as any })
        .plug(() => {
          throw new Error('bar')
        }).run({} as any)
    await expect(p2).to.be.rejectedWith(Error, 'bar')
  })
})
