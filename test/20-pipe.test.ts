import { expect } from 'chai'
import { PlugPipe, TaskPipe } from '../src/pipe'
import { mock } from './support'

describe('Plug Pipes', () => {
  it('should construct a simple pipeline', async () => {
    const { files, run } = mock('/foo')
    const pipe = new PlugPipe()
    const result = await pipe.process(files, run)
    expect(result).to.equal(files)
  })

  it('should construct and run a multi-stage pipeline', async () => {
    const pipeline = new PlugPipe()
        .plug((input) => input + '...1' as any)
        .plug((input) => Promise.resolve(input + '...2' as any))
        .plug({ process: (input) => input + '...3' as any })
        .plug({ process: (input) => Promise.resolve(input + '...4' as any) })

    const { run } = mock('/foo')
    expect(await pipeline.process('0' as any, run)).to.equal('0...1...2...3...4')
  })

  it('should construct and run a task pipeline', async () => {
    const pipeline = new TaskPipe({ run: () => 0 as any })
        .plug((input) => input + '...1' as any)
        .plug((input) => Promise.resolve(input + '...2' as any))
        .plug({ process: (input) => input + '...3' as any })
        .plug({ process: (input) => Promise.resolve(input + '...4' as any) })

    const { run } = mock('/foo')
    expect(await pipeline.run(run)).to.equal('0...1...2...3...4')
  })

  it('should throw when an element of the pipe fails', async () => {
    const { files, run } = mock('/foo')
    const p1 = new PlugPipe().plug(() => {
      throw new Error('foo')
    }).process(files, run)
    await expect(p1).to.be.rejectedWith(Error, 'foo')

    const p2 = new TaskPipe({ run: () => null as any })
        .plug(() => {
          throw new Error('bar')
        }).run(run)
    await expect(p2).to.be.rejectedWith(Error, 'bar')
  })
})
