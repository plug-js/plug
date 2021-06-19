import { expect } from 'chai'
import { File, Files } from '../src/files'
import { basename } from 'path'
import { readFileSync, statSync } from 'fs'
import { caseSensitivePaths } from '../src/utils/paths'

describe('Virtual File List', () => {
  it('should create a new Files', () => {
    expect(new Files())
        .to.be.instanceOf(Files)
        .to.have.property('directoryPath', process.cwd())
    expect(new Files('foo'))
        .to.be.instanceOf(Files)
        .to.have.property('directoryPath', process.cwd() + '/foo')
    expect(new Files('/foo'))
        .to.be.instanceOf(Files)
        .to.have.property('directoryPath', '/foo')
  })

  it('should build a Files with files', () => {
    const list = new Files('/foo')
    list.add('one.txt')

    expect(list.directoryPath).to.equal('/foo')

    const files = list.list()
    expect(files.length).to.equal(1)

    const file1 = files[0]
    expect(file1.absolutePath).to.equal('/foo/one.txt')
    expect(file1.relativePath).to.equal('one.txt')
    expect(file1.files).to.equal(list)

    expect(list.get('one.txt')).to.equal(file1) // same instance
    expect(list.get('./one.txt')).to.equal(file1) // same instance
    expect(list.get('/foo/one.txt')).to.equal(file1) // same instance

    const file2 = list.get('./two.bin')
    expect(file2.absolutePath).to.equal('/foo/two.bin')
    expect(file2.relativePath).to.equal('two.bin')
    expect(file2.files).to.equal(list)

    expect(list.get('two.bin')).to.equal(file2) // same instance
    expect(list.get('./two.bin')).to.equal(file2) // same instance
    expect(list.get('/foo/two.bin')).to.equal(file2) // same instance

    const file3 = list.get('/three.out')
    expect(file3.absolutePath).to.equal('/three.out')
    expect(file3.relativePath).to.equal('../three.out')
    expect(file3.files).to.equal(list)

    expect(list.get('../three.out')).to.equal(file3) // same instance
    expect(list.get('/three.out')).to.equal(file3) // same instance

    // list "has" method
    expect(list.has('one.txt')).to.be.true
    expect(list.has('two.txt')).to.be.false

    // relative access
    expect(file1.get('one.txt')).to.equal(file1)
    expect(file1.get('./one.txt')).to.equal(file1)
    expect(file1.get('/foo/one.txt')).to.equal(file1)

    expect(file1.get('two.bin')).to.equal(file2)
    expect(file1.get('./two.bin')).to.equal(file2)
    expect(file1.get('/foo/two.bin')).to.equal(file2)

    expect(file1.get('../three.out')).to.equal(file3)
    expect(file1.get('/three.out')).to.equal(file3)

    expect(file2.get('one.txt')).to.equal(file1)
    expect(file2.get('./one.txt')).to.equal(file1)
    expect(file2.get('/foo/one.txt')).to.equal(file1)

    expect(file2.get('two.bin')).to.equal(file2)
    expect(file2.get('./two.bin')).to.equal(file2)
    expect(file2.get('/foo/two.bin')).to.equal(file2)

    expect(file2.get('../three.out')).to.equal(file3)
    expect(file2.get('/three.out')).to.equal(file3)

    // list of files must _not_ change
    expect(list.list().length).to.equal(1)
    expect(list.list()[0]).to.equal(file1)
    expect(list.list()).not.to.equal(files) // same instance
  })

  it('should add files to an existing Files', () => {
    const files = new Files('/foo')
    const file = files.add('bar.txt', { originalPath: 'bar.src' })

    expect(file.files).to.equal(files)
    expect(file.relativePath).to.equal('bar.txt')
    expect(file.absolutePath).to.equal('/foo/bar.txt')
    expect(file.originalPath).to.equal('/foo/bar.src')

    expect(files.get('bar.txt')).to.equal(file)

    expect(files.add(file)).to.equal(file)

    const files2 = new Files('/foo/baz')
    const file2 = files2.add(file)

    expect(file2).not.to.equal(file)

    expect(file2.files).to.equal(files2)
    expect(file2.relativePath).to.equal('bar.txt')
    expect(file2.absolutePath).to.equal('/foo/baz/bar.txt')
    expect(file2.originalPath).to.equal('/foo/bar.src')

    expect(files2.get('./bar.txt')).to.equal(file2)
    expect(files2.get('/foo/baz/bar.txt')).to.equal(file2)

    expect(files2.add(file2)).to.equal(file2)
  })

  it('should sort file lists', () => {
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

  it('should preserve caches and lists when cloning a Files', () => {
    const files1 = new Files('/foo')
    const file1 = files1.add('bar.txt', {
      contents: 'hello, world!',
      sourceMap: { test: true } as any,
    })
    files1.get('baz.txt') // cached but not in list

    expect(files1.list()).to.eql([ file1 ])
    expect(files1.list()[0]).to.equal(file1)

    const files2 = files1.clone('/')
    const file2 = files2.get('foo/bar.txt')

    expect(file2).not.to.equal(file1)

    expect(files2.list()).to.eql([ file2 ])
    expect(files2.list()[0]).to.equal(file2)

    expect(file2.files).to.equal(files2)
    expect(file2.absolutePath).to.equal('/foo/bar.txt')
    expect(file2.relativePath).to.equal('foo/bar.txt')
    expect(file2.contentsSync()).to.equal('hello, world!')
    expect(file2.sourceMapSync()).to.eql({ test: true })
  })

  it('should honor the case sensitivity of the filesystem', () => {
    const files = new Files(__dirname)

    const fileAdded = files.add(__filename)
    const fileLower = files.get(__filename.toLowerCase())
    const fileUpper = files.get(__filename.toUpperCase())
    const file = files.get(__filename)

    if (caseSensitivePaths) {
      expect(file).to.equal(fileAdded)

      if (file.absolutePath == fileLower.absolutePath) { // this file is all lowercase
        expect(file).to.equal(fileLower)
        expect(file).not.to.equal(fileUpper)
      } else if (file.absolutePath == fileUpper.absolutePath) { // this file is all upper case
        expect(file).not.to.equal(fileLower)
        expect(file).to.equal(fileUpper)
      } else { // this file has mixed case
        expect(file).not.to.equal(fileLower)
        expect(file).not.to.equal(fileUpper)
      }
      expect(fileLower).not.to.equal(fileUpper)
    } else {
      expect(file).to.equal(fileLower)
      expect(file).to.equal(fileUpper)
      expect(file).to.equal(fileAdded)
    }
  })

  describe('Asynchronous Virtual File Access', () => {
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

  describe('Synchronous Virtual File Access', () => {
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
