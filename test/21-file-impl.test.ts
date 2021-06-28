import { FileImpl } from '../src/files/impl'
import { Project } from '../src/project'
import { join } from 'path'
import { disableLogs } from './support'
import { expect } from 'chai'
import { tmpdir } from 'os'
import { DirectoryPath, createFilePath, getParent, FilePath } from '../src/utils/paths'
import { File, Files } from '../src/files'
import { existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'fs'
import { FileSourceMap, SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { RawSourceMap } from 'source-map'

import { directory as directory } from './support'
const filename = join(directory, 'build.ts')

describe('Files', () => {
  function makeFiles(directory: string): Files {
    return new Files({ directory } as Project)
  }

  disableLogs()

  it('should create missing or unreadable files', async () => {
    const dir = directory as DirectoryPath
    const files = makeFiles(getParent(dir))

    expect(() => new FileImpl(files, createFilePath(dir, 'this does not exist')))
        .to.throw(Error, `File "${directory}/this does not exist" not found`)

    expect(() => new FileImpl(files, directory as any as FilePath))
        .to.throw(Error, `File "${directory}" is not a file`)

    expect(new FileImpl(files, filename as FilePath)).to.be.instanceof(FileImpl)
  })

  describe('Asynchronous Virtual File Access', () => {
    it('should create a File', async () => {
      function create(contents: string): File {
        return makeFiles('/foo').add('bar.js', { contents })
      }

      const file1 = create('')
      expect(await file1.contents()).to.equal('')
      expect(await file1.sourceMap()).to.be.undefined

      const file2 = create('// foobar')
      expect(await file2.contents()).to.equal('// foobar')
      expect(await file2.sourceMap()).to.be.undefined

      const sourceMap = FileSourceMap.for('/foo/wrong.js' as any, { version: 3 } as any)
      const file3 = makeFiles('/foo').add('bar.js', { contents: 'any', sourceMap })
      expect(await file3.contents()).to.equal('any')
      expect((await file3.sourceMap())?.file).to.equal('/foo/bar.js')
    })

    it('should create a File with an inline source map', async () => {
      const contents = `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foo`

      function create(sourceMap?: any): File {
        return makeFiles('/foo').add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.eql({ file: file1.absolutePath })

      const file2 = create(true) // extract source map
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.eql({ file: file2.absolutePath })

      const file3 = create(false) // do not process source maps
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined

      const file4 = create({ version: 3 }) // supplied source map
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ file: file4.absolutePath })
    })

    it('should create a File with an external source map', async () => {
      const contents = `//# ${SOURCE_MAPPING_URL}=bar.js.map\n// foo`

      function create(sourceMap?: any): File {
        const list = makeFiles('/foo')
        list.add('bar.js.map', { contents: '{"version":"3"}' }) // yep, string!
        return list.add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.eql({ file: file1.absolutePath })

      const file2 = create(true) // extract source map
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.eql({ file: file2.absolutePath })

      const file3 = create(false) // do not process source maps
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined

      const file4 = create({ version: 3 }) // supplied source map
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ file: file4.absolutePath })
    })

    it('should create a File with a missing external source map', async () => {
      const contents = `//# ${SOURCE_MAPPING_URL}=bar.js.map\n// foo`

      function create(sourceMap?: any): File {
        return makeFiles('/foo').add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(await file1.contents()).to.equal('\n// foo')
      expect(await file1.sourceMap()).to.be.undefined

      const file2 = create(true) // extract source map
      expect(await file2.contents()).to.equal('\n// foo')
      expect(await file2.sourceMap()).to.be.undefined

      const file3 = create(false) // do not process source maps
      expect(await file3.contents()).to.equal(contents)
      expect(await file3.sourceMap()).to.be.undefined

      const file4 = create({ version: 3 }) // supplied source map
      expect(await file4.contents()).to.equal(contents)
      expect(await file4.sourceMap()).to.eql({ file: file4.absolutePath })
    })

    it('should attach a the sourcemap sources', async () => {
      const sourceFiles = makeFiles('/bar')
      const sourceFile = sourceFiles.add('src.txt', 'source')

      const rawSourceMap = { version: 3, sources: [ '/bar/src.txt' ] } as RawSourceMap
      const jsonSourceMap = JSON.stringify(rawSourceMap)
      const base64SourceMap = Buffer.from(jsonSourceMap, 'utf8').toString('base64')

      const targetFiles = makeFiles('/foo')
      targetFiles.add('test.map', { contents: jsonSourceMap })

      const external = targetFiles.add('external.txt', {
        contents: `//# ${SOURCE_MAPPING_URL}=test.map`,
        sourceMapSources: sourceFiles,
      })
      const inline = targetFiles.add('inline.txt', {
        contents: `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,${base64SourceMap}`,
        sourceMapSources: sourceFiles,
      })
      const withRaw = targetFiles.add('withRaw.txt', {
        contents: '',
        sourceMap: rawSourceMap,
        sourceMapSources: sourceFiles,
      })

      expect((await external.sourceMap())?.attachedSources).to.eql([ sourceFile ])
      expect((await inline.sourceMap())?.attachedSources).to.eql([ sourceFile ])
      expect((await withRaw.sourceMap())?.attachedSources).to.eql([ sourceFile ])

      expect((await external.sourceMap())?.attachedSources[0]).to.equal(sourceFile)
      expect((await inline.sourceMap())?.attachedSources[0]).to.equal(sourceFile)
      expect((await withRaw.sourceMap())?.attachedSources[0]).to.equal(sourceFile)
    })

    it('should read a File from disk', async () => {
      const filename = join(directory, 'withsourcemap.js')

      const files = makeFiles(directory)
      const file = files.get(filename)!

      expect(file.absolutePath).to.equal(filename)

      const data = readFileSync(filename, 'utf8')

      const contents = await file.contents()
      const sourceMap = await file.sourceMap()

      expect(contents).to.be.a('string').with.length.lessThan(data.length)
      expect(contents).to.equal(data.substr(0, contents.length))

      expect(sourceMap).to.be.an('object')
      expect(sourceMap).to.eql({ file: filename })
    })

    it('should cache or fail when a file disappears', async () => {
      const dir = mkdtempSync(tmpdir()) as DirectoryPath
      try {
        const path = createFilePath(dir, 'test.txt')
        try {
          writeFileSync(path, 'contents...')

          const files = makeFiles(dir)
          const file1 = new FileImpl(files, path)
          const file2 = new FileImpl(files, path)

          // read file1, _not_ file2, and unlink
          expect(await file1.contents()).to.equal('contents...')
          unlinkSync(path)

          // file1 should have cached contents, file2 should fail
          expect(await file1.contents()).to.equal('contents...')
          await expect(file2.contents()).to.be.rejectedWith(Error)
        } finally {
          if (existsSync(path)) unlinkSync(path)
        }
      } finally {
        if (existsSync(dir)) rmdirSync(dir)
      }
    })
  })

  describe('Synchronous Virtual File Access', () => {
    it('should create a File', () => {
      function create(contents: string): File {
        return makeFiles('/foo').add('bar.js', { contents })
      }

      const file1 = create('')
      expect(file1.contentsSync()).to.equal('')
      expect(file1.sourceMapSync()).to.be.undefined

      const file2 = create('// foobar')
      expect(file2.contentsSync()).to.equal('// foobar')
      expect(file2.sourceMapSync()).to.be.undefined

      const sourceMap = FileSourceMap.for('/foo/wrong.js' as any, { version: 3 } as any)
      const file3 = makeFiles('/foo').add('bar.js', { contents: 'any', sourceMap })
      expect(file3.contentsSync()).to.equal('any')
      expect(file3.sourceMapSync()?.file).to.eql('/foo/bar.js')
    })

    it('should create a File with an inline source map', () => {
      const contents = `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foo`

      function create(sourceMap?: any): File {
        return makeFiles('/foo').add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.eql({ file: file1.absolutePath })

      const file2 = create(true) // extract source map
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.eql({ file: file1.absolutePath })

      const file3 = create(false) // do not process source maps
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined

      const file4 = create({ version: 3 }) // supplied source map
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ file: file4.absolutePath })
    })

    it('should create a File with an external source map', () => {
      const contents = `//# ${SOURCE_MAPPING_URL}=bar.js.map\n// foo`

      function create(sourceMap?: any): File {
        const list = makeFiles('/foo')
        list.add('bar.js.map', { contents: '{"version":"3"}' }) // yep, string!
        return list.add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.eql({ file: file1.absolutePath })

      const file2 = create(true) // extract source map
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.eql({ file: file2.absolutePath })

      const file3 = create(false) // do not process source maps
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined

      const file4 = create({ version: 3 }) // supplied source map
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ file: file4.absolutePath })
    })

    it('should create a File with a missing external source map', () => {
      const contents = `//# ${SOURCE_MAPPING_URL}=bar.js.map\n// foo`

      function create(sourceMap?: any): File {
        return makeFiles('/foo').add('bar.js', { contents, sourceMap })
      }

      const file1 = create() // extract source map (default)
      expect(file1.contentsSync()).to.equal('\n// foo')
      expect(file1.sourceMapSync()).to.be.undefined

      const file2 = create(true) // extract source map
      expect(file2.contentsSync()).to.equal('\n// foo')
      expect(file2.sourceMapSync()).to.be.undefined

      const file3 = create(false) // do not process source maps
      expect(file3.contentsSync()).to.equal(contents)
      expect(file3.sourceMapSync()).to.be.undefined

      const file4 = create({ version: 3 }) // supplied source map
      expect(file4.contentsSync()).to.equal(contents)
      expect(file4.sourceMapSync()).to.eql({ file: file4.absolutePath })
    })

    it('should attach a the sourcemap sources', () => {
      const sourceFiles = makeFiles('/bar')
      const sourceFile = sourceFiles.add('src.txt', 'source')

      const rawSourceMap = { version: 3, sources: [ '/bar/src.txt' ] } as RawSourceMap
      const jsonSourceMap = JSON.stringify(rawSourceMap)
      const base64SourceMap = Buffer.from(jsonSourceMap, 'utf8').toString('base64')

      const targetFiles = makeFiles('/foo')
      targetFiles.add('test.map', { contents: jsonSourceMap })

      const external = targetFiles.add('external.txt', {
        contents: `//# ${SOURCE_MAPPING_URL}=test.map`,
        sourceMapSources: sourceFiles,
      })
      const inline = targetFiles.add('inline.txt', {
        contents: `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,${base64SourceMap}`,
        sourceMapSources: sourceFiles,
      })
      const withRaw = targetFiles.add('withRaw.txt', {
        contents: '',
        sourceMap: rawSourceMap,
        sourceMapSources: sourceFiles,
      })

      expect(external.sourceMapSync()?.attachedSources).to.eql([ sourceFile ])
      expect(inline.sourceMapSync()?.attachedSources).to.eql([ sourceFile ])
      expect(withRaw.sourceMapSync()?.attachedSources).to.eql([ sourceFile ])

      expect(external.sourceMapSync()?.attachedSources[0]).to.equal(sourceFile)
      expect(inline.sourceMapSync()?.attachedSources[0]).to.equal(sourceFile)
      expect(withRaw.sourceMapSync()?.attachedSources[0]).to.equal(sourceFile)
    })

    it('should read a File from disk', () => {
      const filename = join(directory, 'withsourcemap.js')

      const files = makeFiles(directory)
      const file = files.get(filename)!

      expect(file.absolutePath).to.equal(filename)

      const data = readFileSync(filename, 'utf8')
      const contents = file.contentsSync()
      const sourceMap = file.sourceMapSync()

      expect(contents).to.be.a('string').with.length.lessThan(data.length)
      expect(contents).to.equal(data.substr(0, contents.length))

      expect(sourceMap).to.be.an('object')
      expect(sourceMap).to.eql({ file: filename })
    })

    it('should cache or fail when a file disappears', () => {
      const dir = mkdtempSync(tmpdir()) as DirectoryPath
      try {
        const path = createFilePath(dir, 'test.txt')
        try {
          writeFileSync(path, 'contents...')

          const files = makeFiles(dir)
          const file1 = new FileImpl(files, path)
          const file2 = new FileImpl(files, path)

          // read file1, _not_ file2, and unlink
          expect(file1.contentsSync()).to.equal('contents...')
          unlinkSync(path)

          // file1 should have cached contents, file2 should fail
          expect(file1.contentsSync()).to.equal('contents...')
          expect(() => file2.contentsSync()).to.throw(Error)
        } finally {
          if (existsSync(path)) unlinkSync(path)
        }
      } finally {
        if (existsSync(dir)) rmdirSync(dir)
      }
    })
  })
})
