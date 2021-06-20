import { expect } from 'chai'
import { Files } from '../src/files'
import { PlugPipe } from '../src/pipe'
import { ToPlug } from '../src/plugs/from-to'

describe('Plug From / To', function() {
  it('should be installed', () => {
    expect(new PlugPipe().to).to.be.a('function')
  })

  it('should relocate a directory', () => {
    const input = new Files('/foo/in')
    input.add('bar.txt', { contents: 'hello, world 1!' })
    input.add('bar/baz.txt', { contents: 'hello, world 2!' })

    const output = new ToPlug('/foo/out').process(input)

    expect(output.list().sort()).to.eql([
      { 'absolutePath': '/foo/out/bar.txt', 'originalPath': '/foo/in/bar.txt' },
      { 'absolutePath': '/foo/out/bar/baz.txt', 'originalPath': '/foo/in/bar/baz.txt' },
    ])

    expect(output.get('bar.txt').contentsSync()).to.equals('hello, world 1!')
    expect(output.get('bar/baz.txt').contentsSync()).to.equals('hello, world 2!')
  })
})
