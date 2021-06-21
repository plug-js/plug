import { PlugPipe } from '../src/pipe'
import { ToPlug } from '../src/plugs/to'
import { expect } from 'chai'
import { mock } from './support'

describe('Plug From / To', function() {
  const { run, log } = mock('/foo')

  it('should be installed', () => {
    expect(new PlugPipe().to).to.be.a('function')
  })

  it('should relocate a directory to an absolute path', () => {
    const input = mock('/foo/in').files
    input.add('bar.txt', { contents: 'hello, world 1!' })
    input.add('bar/baz.txt', { contents: 'hello, world 2!' })

    const output = new ToPlug('/foo/out').process(input, run, log)

    expect(output.list().sort()).to.eql([
      { 'absolutePath': '/foo/out/bar.txt', 'originalPath': '/foo/in/bar.txt' },
      { 'absolutePath': '/foo/out/bar/baz.txt', 'originalPath': '/foo/in/bar/baz.txt' },
    ])

    expect(output.get('bar.txt').contentsSync()).to.equals('hello, world 1!')
    expect(output.get('bar/baz.txt').contentsSync()).to.equals('hello, world 2!')
  })

  it('should relocate a directory to a relative path', () => {
    const input = mock('/foo/in').files
    input.add('bar.txt', { contents: 'hello, world 1!' })
    input.add('bar/baz.txt', { contents: 'hello, world 2!' })

    const output = new ToPlug('out').process(input, run, log)

    expect(output.list().sort()).to.eql([
      { 'absolutePath': '/foo/out/bar.txt', 'originalPath': '/foo/in/bar.txt' },
      { 'absolutePath': '/foo/out/bar/baz.txt', 'originalPath': '/foo/in/bar/baz.txt' },
    ])

    expect(output.get('bar.txt').contentsSync()).to.equals('hello, world 1!')
    expect(output.get('bar/baz.txt').contentsSync()).to.equals('hello, world 2!')
  })

  it('should pass through if the directory is unchanged', () => {
    const input = mock('/foo').files
    const output = new ToPlug('.').process(input, run, log)
    expect(output).to.equal(input)
  })
})
