import { DirectoryPath } from '../src/utils/paths'
import { basename } from 'path'
import { disableLogs } from './support'
import { expect } from 'chai'
import { File, Files } from '../src/files'
import { readFileSync, statSync } from 'fs'

describe('Files', () => {
  disableLogs()

  describe('Asynchronous Virtual File Access', () => {
    it('should not access missing or unreadable files', async () => {
      const file1 = new Files(__dirname as DirectoryPath).get('this does not exist')
      expect(await file1.exists()).to.be.false
      await expect(file1.contents()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))
      await expect(file1.sourceMap()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))
      await expect(file1.lastModified()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('ENOENT'))

      const file2 = new Files(__dirname as DirectoryPath).get(__dirname)
      expect(await file2.exists()).to.be.false
      await expect(file2.contents()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.sourceMap()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
      await expect(file2.lastModified()).to.be.rejectedWith(Error)
          .then((error) => expect(error.code).to.equal('EISDIR'))
    })

    it('should create a File', async () => {
      function create(contents: string): File {
        return new Files('/foo' as DirectoryPath).add('bar.js', { contents })
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
      const contents = '//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foo'

      function create(sourceMap?: any): File {
        return new Files('/foo' as DirectoryPath).add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.exists()).to.be.true
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.eql({ file: file1.absolutePath })
      expect(await file1.lastModified()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(await file2.exists()).to.be.true
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.eql({ file: file2.absolutePath })
      expect(await file2.lastModified()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(await file3.exists()).to.be.true
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined
      expect(await file3.lastModified()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ version: 3 }) // supplied source map
      expect(await file4.exists()).to.be.true
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ file: file4.absolutePath })
      expect(await file4.lastModified()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with an external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        const list = new Files('/foo' as DirectoryPath)
        list.add('bar.js.map', { contents: '{"version":"3"}' }) // yep, string!
        return list.add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.exists()).to.be.true
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.eql({ file: file1.absolutePath })
      expect(await file1.lastModified()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(await file2.exists()).to.be.true
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.eql({ file: file2.absolutePath })
      expect(await file2.lastModified()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(await file3.exists()).to.be.true
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined
      expect(await file3.lastModified()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ version: 3 }) // supplied source map
      expect(await file4.exists()).to.be.true
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ file: file4.absolutePath })
      expect(await file4.lastModified()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with a missing external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        return new Files('/foo' as DirectoryPath).add('bar.js', { contents, sourceMap })
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

      const file4 = create({ version: 3 }) // supplied source map
      expect(await file4.exists()).to.be.true
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ file: file4.absolutePath })
      expect(await file4.lastModified()).to.be.closeTo(Date.now(), 10)
    })

    it('should read a File from disk', async () => {
      const files = new Files(__dirname as DirectoryPath)
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
      expect(sourceMap).to.eql({ file: __filename })
    })
  })

  describe('Synchronous Virtual File Access', () => {
    it('should not access missing or unreadable files', () => {
      const file1 = new Files(__dirname as DirectoryPath).get('this does not exist')
      expect(file1.existsSync()).to.be.false
      expect(() => file1.contentsSync()).to.throw(Error).with.property('code', 'ENOENT')
      expect(() => file1.sourceMapSync()).to.throw(Error).with.property('code', 'ENOENT')
      expect(() => file1.lastModifiedSync()).to.throw(Error).with.property('code', 'ENOENT')

      const file2 = new Files(__dirname as DirectoryPath).get(__dirname)
      expect(file2.existsSync()).to.be.false
      expect(() => file2.contentsSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.sourceMapSync()).to.throw(Error).with.property('code', 'EISDIR')
      expect(() => file2.lastModifiedSync()).to.throw(Error).with.property('code', 'EISDIR')
    })

    it('should create a File', () => {
      function create(contents: string): File {
        return new Files('/foo' as DirectoryPath).add('bar.js', { contents })
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
      const contents = '//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foo'

      function create(sourceMap?: any): File {
        return new Files('/foo' as DirectoryPath).add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.existsSync()).to.be.true
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.eql({ file: file1.absolutePath })
      expect(file1.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(file2.existsSync()).to.be.true
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.eql({ file: file1.absolutePath })
      expect(file2.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(file3.existsSync()).to.be.true
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined
      expect(file3.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ version: 3 }) // supplied source map
      expect(file4.existsSync()).to.be.true
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ file: file4.absolutePath })
      expect(file4.lastModifiedSync()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with an external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        const list = new Files('/foo' as DirectoryPath)
        list.add('bar.js.map', { contents: '{"version":"3"}' }) // yep, string!
        return list.add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.existsSync()).to.be.true
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.eql({ file: file1.absolutePath })
      expect(file1.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file2 = create(true) // extract source map
      expect(file2.existsSync()).to.be.true
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.eql({ file: file2.absolutePath })
      expect(file2.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file3 = create(false) // do not process source maps
      expect(file3.existsSync()).to.be.true
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined
      expect(file3.lastModifiedSync()).to.be.closeTo(Date.now(), 10)

      const file4 = create({ version: 3 }) // supplied source map
      expect(file4.existsSync()).to.be.true
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ file: file4.absolutePath })
      expect(file4.lastModifiedSync()).to.be.closeTo(Date.now(), 10)
    })

    it('should create a File with a missing external source map', async () => {
      const contents = '//# sourceMappingURL=bar.js.map\n// foo'

      function create(sourceMap?: any): File {
        return new Files('/foo' as DirectoryPath).add('bar.js', { contents, sourceMap })
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

      const file4 = create({ version: 3 }) // supplied source map
      expect(file4.existsSync()).to.be.true
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ file: file4.absolutePath })
      expect(file4.lastModifiedSync()).to.be.closeTo(Date.now(), 10)
    })

    it('should read a File from disk', () => {
      const files = new Files(__dirname as DirectoryPath)
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
      expect(sourceMap).to.eql({ file: __filename })
    })
  })
})
