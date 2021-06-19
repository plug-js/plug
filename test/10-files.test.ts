import { expect } from 'chai'
import { File, Files } from '../src/files'
import { basename } from 'path'
import { readFileSync, statSync } from 'fs'
import { getProjectDirectory } from '../src/project'
import { AssertionError } from 'assert'

describe.only('Virtual File List', () => {
  it('should create a new Files instance', () => {
    expect(new Files())
        .to.be.instanceOf(Files)
        .to.have.property('directory', getProjectDirectory())
    expect(new Files('foo'))
        .to.be.instanceOf(Files)
        .to.have.property('directory', getProjectDirectory() + '/foo')
    expect(new Files('/foo'))
        .to.be.instanceOf(Files)
        .to.have.property('directory', '/foo')
  })

  it('should get files from a Files instance with case sensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true

      const files = new Files('/Foo')
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

      const files = new Files('/Foo')
      const file = files.get('Bar.Txt')

      expect(file.files).to.equal(files)
      expect(file.absolutePath).to.equal('/Foo/Bar.Txt')
      expect(file.originalPath).to.equal('/Foo/Bar.Txt')
      expect(file.relativePath).to.equal('bar.txt') // case insensitive
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
      const list = new Files('/Foo')
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
    expect(() => new Files('/foo').add('')).to.throw(AssertionError, 'No path for file to be added')
    expect(() => new Files('/foo').add('/bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
    expect(() => new Files('/foo').add('../bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
  })

  it('should add a simple path with case insensitive paths', () => {
    try {
      (<any> globalThis).caseSensitivePaths = false
      const list = new Files('/Foo')
      list.add('One.Txt')

      const files = list.list()
      expect(files.length).to.equal(1)

      const file1 = files[0]
      expect(file1.relativePath).to.equal('one.txt') // case insensitive
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
    const files = new Files('/foo')
    const file1 = files.add('bar.txt', {
      contents: 'hello, world!',
      sourceMap: { test: true } as any,
    })

    expect(files.list()).to.eql([ file1 ])
    expect(files.list()[0]).to.equal(file1)

    expect(file1.absolutePath).to.equal('/foo/bar.txt')
    expect(file1.originalPath).to.equal('/foo/bar.txt')
    expect(file1.contentsSync()).to.equal('hello, world!')
    expect(file1.sourceMapSync()).to.eql({ test: true })

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
    expect(file2.sourceMapSync()).to.eql({ test: false })
  })

  it('should add a file', () => {
    const files = new Files('/foo')

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

  it('should sort files', () => {
    const files = new Files('/foo')
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

  it('should preserve clone a file list', () => {
    const filesA = new Files('/foo')
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

  describe.skip('Asynchronous Virtual File Access', () => {
    it('should not access missing or unreadable files', async () => {
      const file1 = new Files(__dirname).get('this does not exist')
      expect(await file1.exists()).to.be.false
      await expect(file1.contents()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))
      await expect(file1.sourceMap()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))
      await expect(file1.lastModified()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))

      const file2 = new Files(__dirname).get(__dirname)
      await expect(file2.exists()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.contents()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.sourceMap()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.lastModified()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
    })

    it('should create a File', async () => {
      function create(contents: string): File {
        return new Files('/foo').add('bar.js', { contents })
      }

      const file1 = create('')
      expect(await file1.exists()).to.be.true
      expect(await file1.contents()).to.equal('')
      expect(await file1.sourceMap()).to.be.undefined
      expect(await file1.lastModified()).to.be.closeTo(Date.now(), 10)

      const file2 = create('// foobar')
      expect(await file2.exists()).to.be.true
      expect(await file2.contents()).to.equal('// foobar')
      expect(await file2.sourceMap()).to.be.undefined
      expect(await file2.lastModified()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with an inline source map', async () => {
      const contents = '//# sourceMappingURL=data:application/json;base64,e30=\n// foo'

      function create(sourceMap?: any): File {
        return new Files().add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.exists()).to.be.true
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.eql({})
      expect(await file1.lastModified()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(await file2.exists()).to.be.true
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.eql({})
      expect(await file2.lastModified()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(await file3.exists()).to.be.true
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined
      expect(await file3.lastModified()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ foo: 'bar' }) // supplied source map
      expect(await file4.exists()).to.be.true
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ foo: 'bar' })
      expect(await file4.lastModified()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with an external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        const list = new Files('/foo')
        list.add('bar.js.map', { contents: '{"foo":"bar"}' })
        return list.add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.exists()).to.be.true
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.eql({ foo: 'bar' })
      expect(await file1.lastModified()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(await file2.exists()).to.be.true
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.eql({ foo: 'bar' })
      expect(await file2.lastModified()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(await file3.exists()).to.be.true
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined
      expect(await file3.lastModified()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ foo: 'bar' }) // supplied source map
      expect(await file4.exists()).to.be.true
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ foo: 'bar' })
      expect(await file4.lastModified()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with a missing external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        return new Files('/foo').add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.exists()).to.be.true
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.be.undefined
      expect(await file1.lastModified()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(await file2.exists()).to.be.true
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.be.undefined
      expect(await file2.lastModified()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(await file3.exists()).to.be.true
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined
      expect(await file3.lastModified()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ foo: 'bar' }) // supplied source map
      expect(await file4.exists()).to.be.true
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ foo: 'bar' })
      expect(await file4.lastModified()).to.be.closeTo(Date.now(), 10)
    })

    it('should read a File from disk', async () => {
      const files = new Files(__dirname)
      const file = files.get(__filename)
      const relative = basename(__filename)

      expect(file.absolutePath).to.equal(__filename)
      expect(file.relativePath).to.equal(relative)

      const data = readFileSync(__filename, 'utf8')
      const lastModified = statSync(__filename).mtimeMs

      expect(await file.exists()).to.be.true
      expect(await file.lastModified()).to.equal(lastModified)

      const contents = await file.contents()
      const sourceMap = await file.sourceMap()

      expect(contents).to.be.a('string').with.length.lessThan(data.length)
      expect(contents).to.equal(data.substr(0, contents.length))

      expect(sourceMap).to.be.an('object')
      expect(sourceMap?.version).to.equal(3)
      expect(sourceMap?.file).to.equal(relative)
    })
  })

  describe.skip('Synchronous Virtual File Access', () => {
    it('should not access missing or unreadable files', () => {
      const file1 = new Files(__dirname).get('this does not exist')
      expect(file1.existsSync()).to.be.false
      expect(() => file1.contentsSync()).to.throw(Error).with.property('code', 'ENOENT')
      expect(() => file1.sourceMapSync()).to.throw(Error).with.property('code', 'ENOENT')
      expect(() => file1.lastModifiedSync()).to.throw(Error).with.property('code', 'ENOENT')

      const file2 = new Files(__dirname).get(__dirname)
      expect(() => file2.existsSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.contentsSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.sourceMapSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.lastModifiedSync()).to.throw(Error).with.property('code', 'EISDIR')
    })

    it('should create a File', () => {
      function create(contents: string): File {
        return new Files('/foo').add('bar.js', { contents })
      }

      const file1 = create('')
      expect(file1.existsSync()).to.be.true
      expect(file1.contentsSync()).to.equal('')
      expect(file1.sourceMapSync()).to.be.undefined
      expect(file1.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file2 = create('// foobar')
      expect(file2.existsSync()).to.be.true
      expect(file2.contentsSync()).to.equal('// foobar')
      expect(file2.sourceMapSync()).to.be.undefined
      expect(file2.lastModifiedSync()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with an inline source map', async () => {
      const contents = '//# sourceMappingURL=data:application/json;base64,e30=\n// foo'

      function create(sourceMap?: any): File {
        return new Files('/foo').add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.existsSync()).to.be.true
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.eql({})
      expect(file1.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(file2.existsSync()).to.be.true
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.eql({})
      expect(file2.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(file3.existsSync()).to.be.true
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined
      expect(file3.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ foo: 'bar' }) // supplied source map
      expect(file4.existsSync()).to.be.true
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ foo: 'bar' })
      expect(file4.lastModifiedSync()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with an external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        const list = new Files('/foo')
        list.add('bar.js.map', { contents: '{"foo":"bar"}' })
        return list.add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.existsSync()).to.be.true
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.eql({ foo: 'bar' })
      expect(file1.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(file2.existsSync()).to.be.true
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.eql({ foo: 'bar' })
      expect(file2.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(file3.existsSync()).to.be.true
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined
      expect(file3.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ foo: 'bar' }) // supplied source map
      expect(file4.existsSync()).to.be.true
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ foo: 'bar' })
      expect(file4.lastModifiedSync()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with a missing external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        return new Files('/foo').add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.existsSync()).to.be.true
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.be.undefined
      expect(file1.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(file2.existsSync()).to.be.true
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.be.undefined
      expect(file2.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(file3.existsSync()).to.be.true
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined
      expect(file3.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ foo: 'bar' }) // supplied source map
      expect(file4.existsSync()).to.be.true
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ foo: 'bar' })
      expect(file4.lastModifiedSync()).to.be.closeTo(Date.now(), 10)
    })

    it('should read a File from disk', () => {
      const files = new Files(__dirname)
      const file = files.get(__filename)
      const relative = basename(__filename)

      expect(file.absolutePath).to.equal(__filename)
      expect(file.relativePath).to.equal(relative)

      const data = readFileSync(__filename, 'utf8')
      const lastModified = statSync(__filename).mtimeMs
      const contents = file.contentsSync()
      const sourceMap = file.sourceMapSync()

      expect(file.existsSync()).to.be.true
      expect(file.lastModifiedSync()).to.equal(lastModified)

      expect(contents).to.be.a('string').with.length.lessThan(data.length)
      expect(contents).to.equal(data.substr(0, contents.length))

      expect(sourceMap).to.be.an('object')
      expect(sourceMap?.version).to.equal(3)
      expect(sourceMap?.file).to.equal(relative)
    })
  })
})
