import { expect } from 'chai'
import { Plug, Pipeline, getProjectDirectory } from '../src'

describe('Plug Pipelines', () => {
  it('should construct a simple pipeline', async () => {
    const pipe = Pipeline.pipe()
    const list = await Pipeline.run(pipe)
    expect(list.directoryPath).to.equal(getProjectDirectory())
    expect(list.list()).to.eql([])
  })

  it('should construct and run a multi-stage pipeline', async () => {
    const pipe = new class extends Pipeline {
      constructor() {
        super(() => Promise.resolve('0' as any))
      }
    }

    const p1 = pipe.plug((input) => input + '...1' as any)
    expect(p1).to.equal(pipe)

    const p2 = pipe.plug((input) => Promise.resolve(input + '...2' as any))
    expect(p2).to.equal(pipe)

    expect(await Pipeline.run(pipe)).to.equal('0...1...2')
  })

  it('should install a plug in the pipeline', async () => {
    class TestPlug implements Plug {
      private instance: number

      constructor(instance: number) {
        this.instance = instance
      }

      process(input: any): any {
        return `${input}...[${this.instance}]` as any
      }
    }

    const installed = Pipeline.install('test123', TestPlug)

    const processor = installed(0)
    expect(processor('foo' as any)).to.equal('foo...[0]')

    const pipe = new class extends Pipeline {
      constructor() {
        super(() => Promise.resolve('0' as any))
      }
    }

    expect((<any> pipe)['test123']).to.be.a('function')

    const p1 = pipe.plug((input) => input + '...1' as any)
    expect(p1).to.equal(pipe)

    const p2 = pipe.plug(installed(2))
    expect(p2).to.equal(pipe)

    const p3 = (<any> pipe).test123(3)
    expect(p3).to.equal(pipe)

    const p4 = pipe.plug((input) => Promise.resolve(input + '...4' as any))
    expect(p4).to.equal(pipe)

    expect(await Pipeline.run(pipe)).to.equal('0...1...[2]...[3]...4')
  })
})
