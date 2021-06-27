import { expect } from 'chai'
import { PlugPipe } from '../src/pipe'
import { MochaPlug } from '../src/plugs/mocha'

describe('Plug Mocha Processor', () => {
  it('should be installed', async () => {
    expect(new PlugPipe().mocha).to.be.a('function')
    new MochaPlug('foo') // remove me
  })
})
