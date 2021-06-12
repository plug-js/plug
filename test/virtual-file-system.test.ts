import { expect } from 'chai'
import { VirtualFile, VirtualFileSystem } from '../src/virtual-file-system'
import { basename } from 'path'
import { readFileSync, statSync } from 'fs'

describe('Virtual File System', () => {
  it('should create a new VirtualFileSystem', () => {
    expect(new VirtualFileSystem())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', process.cwd())
    expect(new VirtualFileSystem('foo'))
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', process.cwd() + '/foo')
    expect(new VirtualFileSystem('/foo'))
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', '/foo')

    expect(VirtualFileSystem.builder().build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', process.cwd())
    expect(VirtualFileSystem.builder('foo').build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', process.cwd() + '/foo')
    expect(VirtualFileSystem.builder('/foo').build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', '/foo')

    const virtualFileSystem = new VirtualFileSystem('/foo/bar')

    expect(virtualFileSystem.builder().build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', '/foo/bar')
    expect(virtualFileSystem.builder('baz').build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', '/foo/bar/baz')
    expect(virtualFileSystem.builder('..').build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', '/foo')
    expect(virtualFileSystem.builder('../baz').build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', '/foo/baz')
    expect(virtualFileSystem.builder('/baz').build())
        .to.be.instanceOf(VirtualFileSystem)
        .to.have.property('baseDir', '/baz')
  })

  it('should build a VirtualFileSystem with files', () => {
    const virtualFileSystem = VirtualFileSystem
        .builder('/foo')
        .add('one.txt')
        .build()

    expect(virtualFileSystem.baseDir).to.equal('/foo')

    const files = virtualFileSystem.list()
    expect(files.length).to.equal(1)

    const file1 = files[0]
    expect(file1.absolutePath).to.equal('/foo/one.txt')
    expect(file1.relativePath).to.equal('one.txt')
    expect(file1.fileSystem).to.equal(virtualFileSystem)

    expect(virtualFileSystem.get('one.txt')).to.equal(file1) // same instance
    expect(virtualFileSystem.get('./one.txt')).to.equal(file1) // same instance
    expect(virtualFileSystem.get('/foo/one.txt')).to.equal(file1) // same instance

    const file2 = virtualFileSystem.get('./two.bin')
    expect(file2.absolutePath).to.equal('/foo/two.bin')
    expect(file2.relativePath).to.equal('two.bin')
    expect(file2.fileSystem).to.equal(virtualFileSystem)

    expect(virtualFileSystem.get('two.bin')).to.equal(file2) // same instance
    expect(virtualFileSystem.get('./two.bin')).to.equal(file2) // same instance
    expect(virtualFileSystem.get('/foo/two.bin')).to.equal(file2) // same instance

    const file3 = virtualFileSystem.get('/three.out')
    expect(file3.absolutePath).to.equal('/three.out')
    expect(file3.relativePath).to.equal('../three.out')
    expect(file3.fileSystem).to.equal(virtualFileSystem)

    expect(virtualFileSystem.get('../three.out')).to.equal(file3) // same instance
    expect(virtualFileSystem.get('/three.out')).to.equal(file3) // same instance

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
    expect(virtualFileSystem.list().length).to.equal(1)
    expect(virtualFileSystem.list()[0]).to.equal(file1)
    expect(virtualFileSystem.list()).not.to.equal(files) // same instance
  })

  it('should not continue building a VirtualFileSystem', () => {
    const builder = VirtualFileSystem.builder()
    builder.build() // should block the building

    expect(() => builder.build()).to.throw(Error, 'Virtual file system already built')
    expect(() => builder.add('foo')).to.throw(Error, 'Virtual file system already built')
  })

  it('should honor the case sensitivity of the filesystem', () => {
    const fileSystem = VirtualFileSystem
        .builder(__dirname)
        .add(__filename)
        .build()

    const file = fileSystem.get(__filename)
    const fileAdded = fileSystem.list()[0]
    const fileLower = fileSystem.get(__filename.toLowerCase())
    const fileUpper = fileSystem.get(__filename.toUpperCase())

    if (fileSystem.caseSensitive) {
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
      const file1 = new VirtualFileSystem(__dirname).get('this does not exist')
      expect(await file1.exists()).to.be.false
      await expect(file1.contents()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))
      await expect(file1.sourceMap()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))
      await expect(file1.lastModified()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))

      const file2 = new VirtualFileSystem(__dirname).get(__dirname)
      await expect(file2.exists()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.contents()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.sourceMap()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.lastModified()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
    })

    it('should create a VirtualFile', async () => {
      function create(contents?: any, sourceMap?: any): VirtualFile {
        return VirtualFileSystem
            .builder('/foo')
            .add('bar.js', contents, sourceMap)
            .build()
            .get('bar.js')
      }

      const file0 = create('')
      expect(await file0.exists()).to.be.true
      expect(await file0.contents()).to.equal('')
      expect(await file0.sourceMap()).to.be.undefined
      expect(await file0.lastModified()).to.be.closeTo(Date.now(), 2)

      const file1 = create('// foobar')
      expect(await file1.exists()).to.be.true
      expect(await file1.contents()).to.equal('// foobar')
      expect(await file1.sourceMap()).to.be.undefined
      expect(await file1.lastModified()).to.be.closeTo(Date.now(), 2)

      const data = '//# sourceMappingURL=data:application/json;base64,e30=\n// foo'

      const file2 = create(data) // extract source map (default)
      expect(await file2.exists()).to.be.true
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.eql({})
      expect(await file2.lastModified()).to.be.closeTo(Date.now(), 2)

      const file3 = create(data, true) // extract source map
      expect(await file3.exists()).to.be.true
      expect(await file3.contents()).to.equal('\n// foo')
      expect(await file3.sourceMap()).to.eql({})
      expect(await file3.lastModified()).to.be.closeTo(Date.now(), 2)

      const file4 = create(data, false) // do not process source maps
      expect(await file4.exists()).to.be.true
      expect(await file4.contents()).to.equal(data)
      expect(await file4.sourceMap()).to.be.undefined
      expect(await file4.lastModified()).to.be.closeTo(Date.now(), 2)

      const file5 = create(data, { foo: 'bar' }) // supplied source map
      expect(await file5.exists()).to.be.true
      expect(await file5.contents()).to.equal(data)
      expect(await file5.sourceMap()).to.eql({ foo: 'bar' })
      expect(await file5.lastModified()).to.be.closeTo(Date.now(), 2)
    })

    it('should read a VirtualFile from disk', async () => {
      const fileSystem = new VirtualFileSystem(__dirname)
      const file = fileSystem.get(__filename)
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
      const file1 = new VirtualFileSystem(__dirname).get('this does not exist')
      expect(file1.existsSync()).to.be.false
      expect(() => file1.contentsSync()).to.throw(Error).with.property('code', 'ENOENT')
      expect(() => file1.sourceMapSync()).to.throw(Error).with.property('code', 'ENOENT')
      expect(() => file1.lastModifiedSync()).to.throw(Error).with.property('code', 'ENOENT')

      const file2 = new VirtualFileSystem(__dirname).get(__dirname)
      expect(() => file2.existsSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.contentsSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.sourceMapSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.lastModifiedSync()).to.throw(Error).with.property('code', 'EISDIR')
    })

    it('should create a VirtualFile', () => {
      function create(contents?: any, sourceMap?: any): VirtualFile {
        return VirtualFileSystem
            .builder('/foo')
            .add('bar.js', contents, sourceMap)
            .build()
            .get('bar.js')
      }

      const file0 = create('')
      expect(file0.existsSync()).to.be.true
      expect(file0.contentsSync()).to.equal('')
      expect(file0.sourceMapSync()).to.be.undefined
      expect(file0.lastModifiedSync()).to.be.closeTo(Date.now(), 2)

      const file1 = create('// foobar')
      expect(file1.existsSync()).to.be.true
      expect(file1.contentsSync()).to.equal('// foobar')
      expect(file1.sourceMapSync()).to.be.undefined
      expect(file1.lastModifiedSync()).to.be.closeTo(Date.now(), 2)

      const data = '//# sourceMappingURL=data:application/json;base64,e30=\n// foo'

      const file2 = create(data) // extract source map (default)
      expect(file2.existsSync()).to.be.true
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.eql({})
      expect(file2.lastModifiedSync()).to.be.closeTo(Date.now(), 2)

      const file3 = create(data, true) // extract source map
      expect(file3.existsSync()).to.be.true
      expect(file3.contentsSync()).to.equal('\n// foo')
      expect(file3.sourceMapSync()).to.eql({})
      expect(file3.lastModifiedSync()).to.be.closeTo(Date.now(), 2)

      const file4 = create(data, false) // do not process source maps
      expect(file4.existsSync()).to.be.true
      expect(file4.contentsSync()).to.equal(data)
      expect(file4.sourceMapSync()).to.be.undefined
      expect(file4.lastModifiedSync()).to.be.closeTo(Date.now(), 2)

      const file5 = create(data, { foo: 'bar' }) // supplied source map
      expect(file5.existsSync()).to.be.true
      expect(file5.contentsSync()).to.equal(data)
      expect(file5.sourceMapSync()).to.eql({ foo: 'bar' })
      expect(file5.lastModifiedSync()).to.be.closeTo(Date.now(), 2)
    })

    it('should read a VirtualFile from disk', () => {
      const fileSystem = new VirtualFileSystem(__dirname)
      const file = fileSystem.get(__filename)
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
