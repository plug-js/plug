import { FilePath } from '../src/utils/paths'
import { expect } from 'chai'
import { extractSourceMap } from '../src/source-maps'
import { extractSourceMappingURL } from '../src/source-maps/extract'
import { parseSourceMappingURL } from '../src/source-maps/parse'
// import { SourceMapGenerator } from 'source-map'

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

  it('should parse a source mapping URL', () => {
    const file = '/foo/bar/baz.js' as FilePath

    expect(parseSourceMappingURL(file)).to.eql({})

    expect(parseSourceMappingURL(file, 'http://www/')).to.eql({})

    expect(parseSourceMappingURL(file, 'file:///foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, '/foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, '../bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, './baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, 'baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })

    expect(parseSourceMappingURL(file, 'data:application/json;base64,eyJ2ZXJzaW9uIjozfQ==')).to.eql({ sourceMap: { file } })
    expect(parseSourceMappingURL(file, 'data:application/json;base64,eyJ2ZXJzaW9uIjozfQ')).to.eql({ sourceMap: { file } })
    expect(() => parseSourceMappingURL(file, 'data:application/json;base64,')).to.throw(SyntaxError)
  })

  it('should extract some source map data', () => {
    const file = '/foo/bar/baz.js' as FilePath

    expect(extractSourceMap(file, '//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foobar', false)).to.eql({
      contents: '//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foobar',
      sourceMapFile: undefined,
      sourceMap: { file },
    })

    expect(extractSourceMap(file, '//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foobar', true)).to.eql({
      contents: '\n// foobar',
      sourceMapFile: undefined,
      sourceMap: { file },
    })

    expect(extractSourceMap(file, '//# sourceMappingURL=baz.js.map\n// foobar', false)).to.eql({
      contents: '//# sourceMappingURL=baz.js.map\n// foobar',
      sourceMapFile: '/foo/bar/baz.js.map',
      sourceMap: undefined,
    })

    expect(extractSourceMap(file, '//# sourceMappingURL=baz.js.map\n// foobar', true)).to.eql({
      contents: '\n// foobar',
      sourceMapFile: '/foo/bar/baz.js.map',
      sourceMap: undefined,
    })

    expect(extractSourceMap(file, '//# sourceMappingURL=\n// foobar', false)).to.eql({
      contents: '//# sourceMappingURL=\n// foobar',
      sourceMapFile: undefined,
      sourceMap: undefined,
    })

    expect(extractSourceMap(file, '//# sourceMappingURL=\n// foobar', true)).to.eql({
      contents: '//# sourceMappingURL=\n// foobar',
      sourceMapFile: undefined,
      sourceMap: undefined,
    })
  })

  describe('File based source maps', () => {
    it.skip('should do something', async () => {
      // const file = '/foo/bar.js' as FilePath
      // const generator = new SourceMapGenerator({ file })
      // generator.addMapping({
      //   name: 'first',
      //   source: 'bar.ts',
      //   original: { line: 1, column: 1 },
      //   generated: { line: 2, column: 2 },
      // })
      // console.log(generator.toJSON())
      // console.log(generator.toString())
    })
  })
})
