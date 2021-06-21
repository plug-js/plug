import { AssertionError } from 'assert'
import { Files } from '../src/files'
import { expect } from 'chai'
import { DirectoryPath, FilePath } from '../src/utils/paths'

describe('File List', () => {
  it('should create a new Files instance', () => {
    expect(new Files('/foo' as DirectoryPath))
        .to.be.instanceOf(Files)
        .to.have.property('directory', '/foo')
    expect(() => new Files('foo' as DirectoryPath))
        .to.throw(AssertionError, 'Not an absolute directory: "foo"')
  })

  it('should get files from a Files instance with case sensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true

      const files = new Files('/Foo' as DirectoryPath)
      const file = files.get('Bar.Txt')

      expect(file.files).to.equal(files)
      expect(file.absolutePath).to.equal('/Foo/Bar.Txt')
      expect(file.originalPath).to.equal('/Foo/Bar.Txt')
      expect(file.relativePath).to.equal('Bar.Txt')
      expect(file.canonicalPath).to.equal('/Foo/Bar.Txt')

      // Re-get the same file
      expect(files.get('Bar.Txt')).to.equal(file)
      expect(files.get('./Bar.Txt')).to.equal(file)
      expect(files.get('Baz/../Bar.Txt')).to.equal(file)
      expect(files.get('../Foo/Bar.Txt')).to.equal(file)
      expect(files.get('/Foo/Bar.Txt')).to.equal(file)

      // Case sensitive, it should not get the same file
      expect(files.get('bar.txt')).not.to.equal(file)
      expect(files.get('./bar.txt')).not.to.equal(file)
      expect(files.get('baz/../bar.txt')).not.to.equal(file)
      expect(files.get('../foo/bar.txt')).not.to.equal(file)
      expect(files.get('/foo/bar.txt')).not.to.equal(file)

      // Re-get the same file, from our File instance
      expect(file.get('Bar.Txt')).to.equal(file)
      expect(file.get('./Bar.Txt')).to.equal(file)
      expect(file.get('Baz/../Bar.Txt')).to.equal(file)
      expect(file.get('../Foo/Bar.Txt')).to.equal(file)
      expect(file.get('/Foo/Bar.Txt')).to.equal(file)

      // Case sensitive, it should not get the same file
      expect(file.get('bar.txt')).to.not.equal(file)
      expect(file.get('./bar.txt')).to.not.equal(file)
      expect(file.get('baz/../bar.txt')).to.not.equal(file)
      expect(file.get('../foo/bar.txt')).to.not.equal(file)
      expect(file.get('/foo/bar.txt')).to.not.equal(file)
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should get files from a Files instance with case insensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = false

      const files = new Files('/Foo' as DirectoryPath)
      const file = files.get('Bar.Txt')

      expect(file.files).to.equal(files)
      expect(file.absolutePath).to.equal('/Foo/Bar.Txt')
      expect(file.originalPath).to.equal('/Foo/Bar.Txt')
      expect(file.relativePath).to.equal('Bar.Txt')
      expect(file.canonicalPath).to.equal('/foo/bar.txt') // case insensitive

      // Re-get the same file
      expect(files.get('Bar.Txt')).to.equal(file)
      expect(files.get('./Bar.Txt')).to.equal(file)
      expect(files.get('Baz/../Bar.Txt')).to.equal(file)
      expect(files.get('../Foo/Bar.Txt')).to.equal(file)
      expect(files.get('/Foo/Bar.Txt')).to.equal(file)

      // Case sensitive, it should not get the same file
      expect(files.get('bar.txt')).to.equal(file)
      expect(files.get('./bar.txt')).to.equal(file)
      expect(files.get('baz/../bar.txt')).to.equal(file)
      expect(files.get('../foo/bar.txt')).to.equal(file)
      expect(files.get('/foo/bar.txt')).to.equal(file)

      // Re-get the same file, from our File instance
      expect(file.get('Bar.Txt')).to.equal(file)
      expect(file.get('./Bar.Txt')).to.equal(file)
      expect(file.get('Baz/../Bar.Txt')).to.equal(file)
      expect(file.get('../Foo/Bar.Txt')).to.equal(file)
      expect(file.get('/Foo/Bar.Txt')).to.equal(file)

      // Case sensitive, it should not get the same file
      expect(file.get('bar.txt')).to.equal(file)
      expect(file.get('./bar.txt')).to.equal(file)
      expect(file.get('baz/../bar.txt')).to.equal(file)
      expect(file.get('../foo/bar.txt')).to.equal(file)
      expect(file.get('/foo/bar.txt')).to.equal(file)
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should add a simple path with case sensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      const list = new Files('/Foo' as DirectoryPath)
      list.add('One.Txt')

      const files = list.list()
      expect(files.length).to.equal(1)

      const file1 = files[0]
      expect(file1.relativePath).to.equal('One.Txt')
      expect(file1.absolutePath).to.equal('/Foo/One.Txt')
      expect(file1.originalPath).to.equal('/Foo/One.Txt')
      expect(file1.canonicalPath).to.equal('/Foo/One.Txt')
      expect(file1.files).to.equal(list)

      expect(list.get('One.Txt')).to.equal(file1) // same instance
      expect(list.get('./One.Txt')).to.equal(file1) // same instance
      expect(list.get('/Foo/One.Txt')).to.equal(file1) // same instance

      expect(list.get('one.txt')).to.not.equal(file1) // case sensitive
      expect(list.get('./one.txt')).to.not.equal(file1) // case sensitive
      expect(list.get('/foo/one.txt')).to.not.equal(file1) // case sensitive

      expect(list.has('One.Txt')).to.be.true
      expect(list.has('./One.Txt')).to.be.true
      expect(list.has('/Foo/One.Txt')).to.be.true

      expect(list.has('one.txt')).to.be.false // case sensitive
      expect(list.has('./one.txt')).to.be.false // case sensitive
      expect(list.has('/foo/one.txt')).to.be.false // case sensitive
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should not add with an empty or invalid path', () => {
    expect(() => new Files('/foo' as DirectoryPath).add('')).to.throw(AssertionError, 'No path for file to be added')
    expect(() => new Files('/foo' as DirectoryPath).add('/bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
    expect(() => new Files('/foo' as DirectoryPath).add('../bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
  })

  it('should add a simple path with case insensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = false
      const list = new Files('/Foo' as DirectoryPath)
      list.add('One.Txt')

      const files = list.list()
      expect(files.length).to.equal(1)

      const file1 = files[0]
      expect(file1.relativePath).to.equal('One.Txt')
      expect(file1.absolutePath).to.equal('/Foo/One.Txt')
      expect(file1.originalPath).to.equal('/Foo/One.Txt')
      expect(file1.canonicalPath).to.equal('/foo/one.txt') // case insensitive
      expect(file1.files).to.equal(list)

      expect(list.get('One.Txt')).to.equal(file1) // same instance
      expect(list.get('./One.Txt')).to.equal(file1) // same instance
      expect(list.get('/Foo/One.Txt')).to.equal(file1) // same instance

      expect(list.get('one.txt')).to.equal(file1) // case insensitive
      expect(list.get('./one.txt')).to.equal(file1) // case insensitive
      expect(list.get('/foo/one.txt')).to.equal(file1) // case insensitive

      expect(list.has('One.Txt')).to.be.true
      expect(list.has('./One.Txt')).to.be.true
      expect(list.has('/Foo/One.Txt')).to.be.true

      expect(list.has('one.txt')).to.be.true // case insensitive
      expect(list.has('./one.txt')).to.be.true // case insensitive
      expect(list.has('/foo/one.txt')).to.be.true // case insensitive
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should add a path with some options', () => {
    const files = new Files('/foo' as DirectoryPath)
    const file1 = files.add('bar.txt', {
      contents: 'hello, world!',
      sourceMap: { version: 3 } as any,
    })

    expect(files.list()).to.eql([ file1 ])
    expect(files.list()[0]).to.equal(file1)

    expect(file1.absolutePath).to.equal('/foo/bar.txt')
    expect(file1.originalPath).to.equal('/foo/bar.txt')
    expect(file1.contentsSync()).to.equal('hello, world!')
    expect(file1.sourceMapSync()?.file).to.eql(file1.absolutePath)

    // overwrite file...
    const file2 = files.add('bar.txt', {
      contents: 'hello, world!',
      sourceMap: { test: false } as any,
      originalPath: '../from/original.txt',
    })

    expect(files.list()).to.eql([ file2 ])
    expect(files.list()[0]).to.equal(file2)

    expect(file2.absolutePath).to.equal('/foo/bar.txt')
    expect(file2.originalPath).to.equal('/from/original.txt')
    expect(file2.contentsSync()).to.equal('hello, world!')
    expect(file2.sourceMapSync()?.file).to.eql(file2.absolutePath)
  })

  it('should add a file', () => {
    const files = new Files('/foo' as DirectoryPath)

    const file1 = files.get('bar.txt') // just get the file
    expect(files.list()).to.eql([])

    // add same file with the same path
    expect(files.add(file1)).to.equals(file1) // same file, just added
    expect(files.list()).to.eql([ file1 ]) // and should show in the list
    expect(files.list()[0]).to.equal(file1) // same instance check

    // add same file with an empty path
    expect(files.add('', file1)).to.equals(file1) // same file, just added
    expect(files.list()).to.eql([ file1 ]) // and should show in the list
    expect(files.list()[0]).to.equal(file1) // same instance check

    // add same file with the same (forced) path
    expect(files.add('bar.txt', file1)).to.equals(file1)
    expect(files.add('/foo/bar.txt', file1)).to.equals(file1)
    expect(files.add('../foo/bar.txt', file1)).to.equals(file1)
    expect(files.list()).to.eql([ file1 ])
    expect(files.list()[0]).to.equal(file1)

    // add same file but with a different path
    const file2 = files.add('baz.txt', file1)
    expect(files.list()).to.eql([ file1, file2 ])
    expect(files.list()[0]).to.equal(file1)
    expect(files.list()[1]).to.equal(file2)
  })

  it('should iterate files', () => {
    const files = new Files('/foo' as DirectoryPath)
    files.add('3.txt')
    files.add('2.txt')
    files.add('1.txt')

    const paths: FilePath[] = []
    for (const file of files) paths.push(file.absolutePath)
    expect(paths.sort()).to.eql([ '/foo/1.txt', '/foo/2.txt', '/foo/3.txt' ])
  })

  it('should sort files', () => {
    const files = new Files('/foo' as DirectoryPath)
    files.add('3.txt')
    files.add('2.txt')
    files.add('1.txt')

    expect(files.list().sort()).to.eql([
      { absolutePath: '/foo/1.txt', originalPath: '/foo/1.txt' },
      { absolutePath: '/foo/2.txt', originalPath: '/foo/2.txt' },
      { absolutePath: '/foo/3.txt', originalPath: '/foo/3.txt' },
    ])

    // force a different sort alogorithm
    expect(files.list().sort((a, b) => b.absolutePath.localeCompare(a.absolutePath))).to.eql([
      { absolutePath: '/foo/3.txt', originalPath: '/foo/3.txt' },
      { absolutePath: '/foo/2.txt', originalPath: '/foo/2.txt' },
      { absolutePath: '/foo/1.txt', originalPath: '/foo/1.txt' },
    ])
  })

  it('should clone a file list', () => {
    const filesA = new Files('/foo' as DirectoryPath)
    const fileA1 = filesA.add('bar.txt', { contents: 'hello, world 1!' })
    const fileA2 = filesA.add('bar/baz.txt', { contents: 'hello, world 2!' })

    expect(filesA.list()).to.eql([ fileA1, fileA2 ])
    expect(filesA.list()[0]).to.equal(fileA1)
    expect(filesA.list()[1]).to.equal(fileA2)

    expect(filesA.get('bar.txt').contentsSync()).to.equals('hello, world 1!')
    expect(filesA.get('bar/baz.txt').contentsSync()).to.equals('hello, world 2!')

    const filesB = filesA.clone()
    const fileB1 = filesB.get('bar.txt')
    const fileB2 = filesB.get('bar/baz.txt')

    expect(fileB1.contentsSync()).to.equals('hello, world 1!')
    expect(fileB2.contentsSync()).to.equals('hello, world 2!')

    expect(filesB.list().sort()).to.eql([ fileB1, fileB2 ])
    expect(filesB.list().sort()[0]).to.equal(fileB1)
    expect(filesB.list().sort()[1]).to.equal(fileB2)

    const filesC = filesA.clone('bar')
    const fileC1 = filesC.get('../bar.txt')
    const fileC2 = filesC.get('baz.txt')

    // file C1 is _outside_ of our list, so won't be listed, but still cached!
    expect(fileC1.contentsSync()).to.equals('hello, world 1!')
    expect(fileC2.contentsSync()).to.equals('hello, world 2!')

    // only file C2 (which is in the correct directory) shows up in the list
    expect(filesC.list()).to.eql([ fileC2 ])
    expect(filesC.list()[0]).to.equal(fileC2)
  })
})
