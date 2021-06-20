import { expect } from 'chai'
import { Plug, PlugPipe, install, TaskPipe } from '../src/pipe'

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
    expect(installed).to.be.a('function')
    expect(installed.name).to.equal('test123')

    expect(TestPlug.prototype).to.have.property('name', 'test123')
    expect(new TestPlug(123)).to.have.property('name', 'test123')

    const processor = installed(0)
    expect(await processor.process('foo' as any, null as any)).to.equal('foo...[0]')

    const pipe1 = new PlugPipe()
    expect((<any> pipe1)['test123']).to.be.a('function')

    const p1 = pipe1.plug((input) => input + '...1' as any)
    const p2 = p1.plug(installed(2))
    const p3 = (<any> p2).test123(3)
    const p4 = p3.plug((input: any) => Promise.resolve(input + '...4' as any))

    expect(await p4.process('0' as any)).to.equal('0...1...[2]...[3]...4')

    const pipe2 = new TaskPipe({ run: () => null as any })
    expect((<any> pipe2)['test123']).to.be.a('function')
  })
})
