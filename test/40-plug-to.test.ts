import { expect } from 'chai'
import { Files } from '../src/files'
import { PlugPipe } from '../src/pipe'
import { ToPlug } from '../src/plugs/to'
import { Run } from '../src/run'
import { DirectoryPath } from '../src/utils/paths'

describe('Plug From / To', function() {
  it('should be installed', () => {
    expect(new PlugPipe().to).to.be.a('function')
  })

  it('should relocate a directory to an absolute path', () => {
    const input = new Files('/foo/in' as DirectoryPath)
    input.add('bar.txt', { contents: 'hello, world 1!' })
    input.add('bar/baz.txt', { contents: 'hello, world 2!' })

    const output = new ToPlug('/foo/out').process(input, new Run('/foo' as DirectoryPath))

    expect(output.list().sort()).to.eql([
      { 'absolutePath': '/foo/out/bar.txt', 'originalPath': '/foo/in/bar.txt' },
      { 'absolutePath': '/foo/out/bar/baz.txt', 'originalPath': '/foo/in/bar/baz.txt' },
    ])

    expect(output.get('bar.txt').contentsSync()).to.equals('hello, world 1!')
    expect(output.get('bar/baz.txt').contentsSync()).to.equals('hello, world 2!')
  })

  it('should relocate a directory to a relative path', () => {
    const input = new Files('/foo/in' as DirectoryPath)
    input.add('bar.txt', { contents: 'hello, world 1!' })
    input.add('bar/baz.txt', { contents: 'hello, world 2!' })

    const output = new ToPlug('out').process(input, new Run('/foo' as DirectoryPath))

    expect(output.list().sort()).to.eql([
      { 'absolutePath': '/foo/out/bar.txt', 'originalPath': '/foo/in/bar.txt' },
      { 'absolutePath': '/foo/out/bar/baz.txt', 'originalPath': '/foo/in/bar/baz.txt' },
    ])

    expect(output.get('bar.txt').contentsSync()).to.equals('hello, world 1!')
    expect(output.get('bar/baz.txt').contentsSync()).to.equals('hello, world 2!')
  })

  it('should pass through if the directory is unchanged', () => {
    const input = new Files('/foo' as DirectoryPath)
    const output = new ToPlug('foo').process(input, new Run('/' as DirectoryPath))
    expect(output).to.equal(input)
  })
})
