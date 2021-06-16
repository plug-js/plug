import { expect } from 'chai'
import { Plug } from '../src'
import { Pipe } from '../src/pipe'
import { install } from '../src/install'

describe('Plug Extensions', () => {
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

    const installed = install('test123', TestPlug)

    const processor = installed(0)
    expect(processor('foo' as any)).to.equal('foo...[0]')

    const pipe = Pipe.pipe()

    expect((<any> pipe)['test123']).to.be.a('function')

    const p1 = pipe.plug((input) => input + '...1' as any)
    const p2 = p1.plug(installed(2))
    const p3 = (<any> p2).test123(3)
    const p4 = p3.plug((input: any) => Promise.resolve(input + '...4' as any))

    expect(await p4.process('0' as any)).to.equal('0...1...[2]...[3]...4')
  })
})
