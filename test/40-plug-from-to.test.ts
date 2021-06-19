import { expect } from 'chai'
import { Files } from '../src/files'
import { PlugPipe } from '../src/pipe'
import { FromToPlug } from '../src/plugs/from-to'

describe('Plug From / To', function() {
  it('should be installed', () => {
    expect(new PlugPipe().from).to.be.a('function')
    expect(new PlugPipe().to).to.be.a('function')
  })

  it('should relocate a directory by cloning it', () => {
    const input = new Files('/foo')
    input.add('bar.txt', { contents: 'hello, world 1!' })
    input.add('bar/baz.txt', { contents: 'hello, world 2!' })

    const output = new FromToPlug('bar').process(input)

    const file1 = output.get('../bar.txt')
    const file2 = output.get('baz.txt')

    // file C1 is _outside_ of our list, so won't be listed, but still cached!
    expect(file1.contentsSync()).to.equals('hello, world 1!')
    expect(file2.contentsSync()).to.equals('hello, world 2!')

    // only file C2 (which is in the correct directory) shows up in the list
    expect(output.list()).to.eql([ file2 ])
    expect(output.list()[0]).to.equal(file2)
  })
})
