import { extractSourceMappingURL, readSourceMapSync, readSourceMap } from '../src/utils/source-maps'
import { expect } from 'chai'
import { VirtualFile, VirtualFileSystem } from '../src/virtual-file-system'

describe('Source Maps', () => {
  it('should extract a source mapping url', () => {
    expect(extractSourceMappingURL('foobar', false))
        .to.eql({ contents: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL=foobar', false))
        .to.eql({ contents: '//# sourceMappingURL=foobar', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = foobar ', false))
        .to.eql({ contents: '//# sourceMappingURL = foobar ', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = ', false))
        .to.eql({ contents: '//# sourceMappingURL = ' })


    expect(extractSourceMappingURL('foobar\n// barfoo', false))
        .to.eql({ contents: 'foobar\n// barfoo' })
    expect(extractSourceMappingURL('//# sourceMappingURL=foobar\n// barfoo', false))
        .to.eql({ contents: '//# sourceMappingURL=foobar\n// barfoo', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = foobar \n// barfoo', false))
        .to.eql({ contents: '//# sourceMappingURL = foobar \n// barfoo', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = \n// barfoo', false))
        .to.eql({ contents: '//# sourceMappingURL = \n// barfoo' })
  })

  it('should extract and wipe source mapping url', () => {
    expect(extractSourceMappingURL('foobar', true))
        .to.eql({ contents: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL=foobar', true))
        .to.eql({ contents: '', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = foobar ', true))
        .to.eql({ contents: '', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = ', true))
        .to.eql({ contents: '//# sourceMappingURL = ' })

    expect(extractSourceMappingURL('foobar\n// barfoo', true))
        .to.eql({ contents: 'foobar\n// barfoo' })
    expect(extractSourceMappingURL('//# sourceMappingURL=foobar\n// barfoo', true))
        .to.eql({ contents: '\n// barfoo', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = foobar \n// barfoo', true))
        .to.eql({ contents: '\n// barfoo', url: 'foobar' })
    expect(extractSourceMappingURL('//# sourceMappingURL = \n// barfoo', true))
        .to.eql({ contents: '//# sourceMappingURL = \n// barfoo' })
  })

  describe('Asynchronous Implementation', () => {
    it('should not read a falsy source map url', async () => {
      expect(await readSourceMap(null as any)).to.be.undefined
      expect(await readSourceMap(null as any, '')).to.be.undefined
      expect(await readSourceMap(null as any, undefined)).to.be.undefined
      expect(await readSourceMap(null as any, false as any)).to.be.undefined
    })

    it('should read an inline source map url', async () => {
      expect(await readSourceMap(null as any, 'data:application/json;base64,e30=')).to.eql({})
      expect(await readSourceMap(null as any, 'data:application/json;base64,e30')).to.eql({})
      await expect(readSourceMap(null as any, 'data:application/json;base64,'))
          .to.be.rejectedWith(SyntaxError, 'Unexpected end of JSON input')
    })

    it('should not read read a non-file url', () => {
      const file = { absolutePath: '/foo/bar/baz' } as VirtualFile
      expect(readSourceMapSync(file, 'foo://bar')).to.be.undefined
    })

    it('should not read a non-existent file url', async () => {
      const mapFile = {
        exists: async () => false,
      } as VirtualFile

      const virtualFileSystem = {
        get(path: string) {
          expect(path).to.eql('/foo/bar/baz.txt.map')
          return mapFile
        },
      } as VirtualFileSystem

      const sourceFile = {
        absolutePath: '/foo/bar/baz.txt',
        fileSystem: virtualFileSystem,
      } as VirtualFile

      expect(await readSourceMap(sourceFile, 'baz.txt.map')).to.be.undefined
      expect(await readSourceMap(sourceFile, './baz.txt.map')).to.be.undefined
      expect(await readSourceMap(sourceFile, '../bar/baz.txt.map')).to.be.undefined
      expect(await readSourceMap(sourceFile, '/foo/bar/baz.txt.map')).to.be.undefined
      expect(await readSourceMap(sourceFile, 'file:/foo/bar/baz.txt.map')).to.be.undefined
      expect(await readSourceMap(sourceFile, 'file:///foo/bar/baz.txt.map')).to.be.undefined
    })

    it('should read a source map from a file url', async () => {
      let data = '{"fake":true}'

      const mapFile = {
        exists: async () => true,
        contents: async () => data,
      } as VirtualFile

      const virtualFileSystem = {
        get(path: string) {
          expect(path).to.eql('/foo/bar/baz.txt.map')
          return mapFile
        },
      } as VirtualFileSystem

      const sourceFile = {
        absolutePath: '/foo/bar/baz.txt',
        fileSystem: virtualFileSystem,
      } as VirtualFile

      expect(await readSourceMap(sourceFile, 'baz.txt.map')).to.eql({ fake: true })
      expect(await readSourceMap(sourceFile, './baz.txt.map')).to.eql({ fake: true })
      expect(await readSourceMap(sourceFile, '../bar/baz.txt.map')).to.eql({ fake: true })
      expect(await readSourceMap(sourceFile, '/foo/bar/baz.txt.map')).to.eql({ fake: true })
      expect(await readSourceMap(sourceFile, 'file:/foo/bar/baz.txt.map')).to.eql({ fake: true })
      expect(await readSourceMap(sourceFile, 'file:///foo/bar/baz.txt.map')).to.eql({ fake: true })

      data = ''

      await expect(readSourceMap(sourceFile, 'baz.txt.map'))
          .to.be.rejectedWith(SyntaxError, 'Unexpected end of JSON input')
      await expect(readSourceMap(sourceFile, './baz.txt.map'))
          .to.be.rejectedWith(SyntaxError, 'Unexpected end of JSON input')
      await expect(readSourceMap(sourceFile, '../bar/baz.txt.map'))
          .to.be.rejectedWith(SyntaxError, 'Unexpected end of JSON input')
      await expect(readSourceMap(sourceFile, '/foo/bar/baz.txt.map'))
          .to.be.rejectedWith(SyntaxError, 'Unexpected end of JSON input')
      await expect(readSourceMap(sourceFile, 'file:/foo/bar/baz.txt.map'))
          .to.be.rejectedWith(SyntaxError, 'Unexpected end of JSON input')
      await expect(readSourceMap(sourceFile, 'file:///foo/bar/baz.txt.map'))
          .to.be.rejectedWith(SyntaxError, 'Unexpected end of JSON input')
    })
  })

  describe('Synchronous Implementation', () => {
    it('should not read a falsy source map url', () => {
      expect(readSourceMapSync(null as any)).to.be.undefined
      expect(readSourceMapSync(null as any, '')).to.be.undefined
      expect(readSourceMapSync(null as any, undefined)).to.be.undefined
      expect(readSourceMapSync(null as any, false as any)).to.be.undefined
    })

    it('should read an inline source map url', () => {
      expect(readSourceMapSync(null as any, 'data:application/json;base64,e30=')).to.eql({})
      expect(readSourceMapSync(null as any, 'data:application/json;base64,e30')).to.eql({})
      expect(() => readSourceMapSync(null as any, 'data:application/json;base64,'))
          .to.throw(SyntaxError, 'Unexpected end of JSON input')
    })

    it('should not read read a non-file url', () => {
      const file = { absolutePath: '/foo/bar/baz' } as VirtualFile
      expect(readSourceMapSync(file, 'foo://bar')).to.be.undefined
    })

    it('should not read a non-existent file url', () => {
      const mapFile = {
        existsSync: () => false,
      } as VirtualFile

      const virtualFileSystem = {
        get(path: string) {
          expect(path).to.eql('/foo/bar/baz.txt.map')
          return mapFile
        },
      } as VirtualFileSystem

      const sourceFile = {
        absolutePath: '/foo/bar/baz.txt',
        fileSystem: virtualFileSystem,
      } as VirtualFile

      expect(readSourceMapSync(sourceFile, 'baz.txt.map')).to.be.undefined
      expect(readSourceMapSync(sourceFile, './baz.txt.map')).to.be.undefined
      expect(readSourceMapSync(sourceFile, '../bar/baz.txt.map')).to.be.undefined
      expect(readSourceMapSync(sourceFile, '/foo/bar/baz.txt.map')).to.be.undefined
      expect(readSourceMapSync(sourceFile, 'file:/foo/bar/baz.txt.map')).to.be.undefined
      expect(readSourceMapSync(sourceFile, 'file:///foo/bar/baz.txt.map')).to.be.undefined
    })

    it('should read a source map from a file url', () => {
      let data = '{"fake":true}'

      const mapFile = {
        existsSync: () => true,
        contentsSync: () => data,
      } as VirtualFile

      const virtualFileSystem = {
        get(path: string) {
          expect(path).to.eql('/foo/bar/baz.txt.map')
          return mapFile
        },
      } as VirtualFileSystem

      const sourceFile = {
        absolutePath: '/foo/bar/baz.txt',
        fileSystem: virtualFileSystem,
      } as VirtualFile

      expect(readSourceMapSync(sourceFile, 'baz.txt.map')).to.eql({ fake: true })
      expect(readSourceMapSync(sourceFile, './baz.txt.map')).to.eql({ fake: true })
      expect(readSourceMapSync(sourceFile, '../bar/baz.txt.map')).to.eql({ fake: true })
      expect(readSourceMapSync(sourceFile, '/foo/bar/baz.txt.map')).to.eql({ fake: true })
      expect(readSourceMapSync(sourceFile, 'file:/foo/bar/baz.txt.map')).to.eql({ fake: true })
      expect(readSourceMapSync(sourceFile, 'file:///foo/bar/baz.txt.map')).to.eql({ fake: true })

      data = ''

      expect(() => readSourceMapSync(sourceFile, 'baz.txt.map'))
          .to.throw(SyntaxError, 'Unexpected end of JSON input')
      expect(() => readSourceMapSync(sourceFile, './baz.txt.map'))
          .to.throw(SyntaxError, 'Unexpected end of JSON input')
      expect(() => readSourceMapSync(sourceFile, '../bar/baz.txt.map'))
          .to.throw(SyntaxError, 'Unexpected end of JSON input')
      expect(() => readSourceMapSync(sourceFile, '/foo/bar/baz.txt.map'))
          .to.throw(SyntaxError, 'Unexpected end of JSON input')
      expect(() => readSourceMapSync(sourceFile, 'file:/foo/bar/baz.txt.map'))
          .to.throw(SyntaxError, 'Unexpected end of JSON input')
      expect(() => readSourceMapSync(sourceFile, 'file:///foo/bar/baz.txt.map'))
          .to.throw(SyntaxError, 'Unexpected end of JSON input')
    })
  })
})
