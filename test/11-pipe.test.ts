import { expect } from 'chai'
import { VirtualFileList } from '../src/files'
import { PlugPipe, TaskPipe } from '../src/pipe'
import { getProjectDirectory } from '../src/project'

describe('Plug Pipes', () => {
  it('should construct a simple pipeline', async () => {
    const list = new VirtualFileList('/foo')
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

  it('should construct a simple task pipeline', async () => {
    const pipe = new TaskPipe()
    const result = await pipe.run({} as any)
    expect(result.directoryPath).to.equal(getProjectDirectory())
  })

  it('should construct and run a multi-stage task pipeline', async () => {
    const pipeline = new TaskPipe()
        .plug((input) => {
          expect(input.directoryPath).to.equal(getProjectDirectory())
          return 0 as any
        })
        .plug((input) => input + '...1' as any)
        .plug((input) => Promise.resolve(input + '...2' as any))
        .plug({ process: (input) => input + '...3' as any })
        .plug({ process: (input) => Promise.resolve(input + '...4' as any) })

    expect(await pipeline.run({} as any)).to.equal('0...1...2...3...4')
  })

  it('should throw when an element of the pipe fails', async () => {
    const p1 = new PlugPipe().plug(() => {
      throw new Error('foo')
    }).process(new VirtualFileList(), {} as any)
    await expect(p1).to.be.rejectedWith(Error, 'foo')

    const p2 = new TaskPipe().plug(() => {
      throw new Error('bar')
    }).run({} as any)
    await expect(p2).to.be.rejectedWith(Error, 'bar')
  })
})
