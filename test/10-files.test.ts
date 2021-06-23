import { AssertionError } from 'assert'
import { FilePath } from '../src/utils/paths'
import { Files } from '../src/files'
import { Project } from '../src/project'
import { expect } from 'chai'

describe('File List', () => {
  function makeFiles(directory: string): Files {
    return new Files({ directory } as Project)
  }

  it('should create a Files instance', () => {
    expect(makeFiles('/foo'))
        .to.be.instanceOf(Files)
        .to.have.property('directory', '/foo')
  })

  it('should get files from a Files instance with case sensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true

      const files = makeFiles('/Foo')
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
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should get files from a Files instance with case insensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = false

      const files = makeFiles('/Foo')
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
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should add a simple path with case sensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      const files = makeFiles('/Foo')
      files.add('One.Txt')

      const list = files.list()
      expect(list.length).to.equal(1)
      expect(files.length).to.equal(1)

      const file1 = list[0]
      expect(file1.relativePath).to.equal('One.Txt')
      expect(file1.absolutePath).to.equal('/Foo/One.Txt')
      expect(file1.originalPath).to.equal('/Foo/One.Txt')
      expect(file1.canonicalPath).to.equal('/Foo/One.Txt')
      expect(file1.files).to.equal(files)

      expect(files.get('One.Txt')).to.equal(file1) // same instance
      expect(files.get('./One.Txt')).to.equal(file1) // same instance
      expect(files.get('/Foo/One.Txt')).to.equal(file1) // same instance

      expect(files.get('one.txt')).to.not.equal(file1) // case sensitive
      expect(files.get('./one.txt')).to.not.equal(file1) // case sensitive
      expect(files.get('/foo/one.txt')).to.not.equal(file1) // case sensitive

      expect(files.has('One.Txt')).to.be.true
      expect(files.has('./One.Txt')).to.be.true
      expect(files.has('/Foo/One.Txt')).to.be.true

      expect(files.has('one.txt')).to.be.false // case sensitive
      expect(files.has('./one.txt')).to.be.false // case sensitive
      expect(files.has('/foo/one.txt')).to.be.false // case sensitive
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should not add with an empty or invalid path', () => {
    expect(() => makeFiles('/foo').add('')).to.throw(AssertionError, 'No path for file to be added')
    expect(() => makeFiles('/foo').add('/bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
    expect(() => makeFiles('/foo').add('../bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
  })

  it('should add a simple path with case insensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = false
      const files = makeFiles('/Foo')
      files.add('One.Txt')

      const list = files.list()
      expect(list.length).to.equal(1)
      expect(files.length).to.equal(1)

      const file1 = list[0]
      expect(file1.relativePath).to.equal('One.Txt')
      expect(file1.absolutePath).to.equal('/Foo/One.Txt')
      expect(file1.originalPath).to.equal('/Foo/One.Txt')
      expect(file1.canonicalPath).to.equal('/foo/one.txt') // case insensitive
      expect(file1.files).to.equal(files)

      expect(files.get('One.Txt')).to.equal(file1) // same instance
      expect(files.get('./One.Txt')).to.equal(file1) // same instance
      expect(files.get('/Foo/One.Txt')).to.equal(file1) // same instance

      expect(files.get('one.txt')).to.equal(file1) // case insensitive
      expect(files.get('./one.txt')).to.equal(file1) // case insensitive
      expect(files.get('/foo/one.txt')).to.equal(file1) // case insensitive

      expect(files.has('One.Txt')).to.be.true
      expect(files.has('./One.Txt')).to.be.true
      expect(files.has('/Foo/One.Txt')).to.be.true

      expect(files.has('one.txt')).to.be.true // case insensitive
      expect(files.has('./one.txt')).to.be.true // case insensitive
      expect(files.has('/foo/one.txt')).to.be.true // case insensitive
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should add a path with some options', () => {
    const files = makeFiles('/foo')
    const file1 = files.add('bar.txt', {
      contents: 'hello, world!',
      sourceMap: { version: 3 } as any,
    })

    expect(files.list()).to.eql([ file1 ])
    expect(files.list()[0]).to.equal(file1)

    expect(file1.absolutePath).to.equal('/foo/bar.txt')
    expect(file1.originalPath).to.equal('/foo/bar.txt')
    expect(file1.contentsSync()).to.equal('hello, world!')
    expect(file1.sourceMapSync()).to.eql({ file: file1.absolutePath })

    // overwrite file...
    const file2 = files.add('bar.txt', {
      contents: 'hello, world!',
      sourceMap: { version: 3 } as any,
      originalPath: '/from/original.txt' as FilePath,
    })

    expect(files.list()).to.eql([ file2 ])
    expect(files.list()[0]).to.equal(file2)

    expect(file2.absolutePath).to.equal('/foo/bar.txt')
    expect(file2.originalPath).to.equal('/from/original.txt')
    expect(file2.contentsSync()).to.equal('hello, world!')
    expect(file2.sourceMapSync()).to.eql({ file: file2.absolutePath })
  })

  it('should add a file', () => {
    const files = makeFiles('/foo')

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
    const files = makeFiles('/foo')
    files.add('3.txt')
    files.add('2.txt')
    files.add('1.txt')

    const paths: FilePath[] = []
    for (const file of files) paths.push(file.absolutePath)
    expect(paths.sort()).to.eql([ '/foo/1.txt', '/foo/2.txt', '/foo/3.txt' ])
  })

  it('should sort files', () => {
    const files = makeFiles('/foo')
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
})
