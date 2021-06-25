import { expect } from 'chai'
import { PlugPipe } from '../src/pipe'
import { WritePlug } from '../src/plugs/write'

describe('Plug Write Processor', () => {
  it('should be installed', () => {
    new WritePlug()
    expect(new PlugPipe().write).to.be.a('function')
  })
})
