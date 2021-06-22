import { FilePath } from '../src/utils/paths'
import { expect } from 'chai'
import { extractSourceMap } from '../src/source-maps'
import { extractSourceMappingURL } from '../src/source-maps/extract'
import { parseSourceMappingURL } from '../src/source-maps/parse'

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
    const path = '/foo/bar/baz.js' as FilePath

    expect(parseSourceMappingURL(path)).to.be.undefined

    expect(parseSourceMappingURL(path, 'http://www/')).to.be.undefined

    expect(parseSourceMappingURL(path, 'file:///foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, '/foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, '../bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, './baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, 'baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })

    expect(parseSourceMappingURL(path, 'data:application/json;base64,e30=')).to.eql({ sourceMap: {} })
    expect(parseSourceMappingURL(path, 'data:application/json;base64,e30')).to.eql({ sourceMap: {} })
    expect(() => parseSourceMappingURL(path, 'data:application/json;base64,')).to.throw(SyntaxError)
  })

  it('should extract some source map data', () => {
    const path = '/foo/bar/baz.js' as FilePath

    expect(extractSourceMap(path, '//# sourceMappingURL=data:application/json;base64,e30\n// foobar', false)).to.eql({
      contents: '//# sourceMappingURL=data:application/json;base64,e30\n// foobar',
      sourceMap: {},
    })

    expect(extractSourceMap(path, '//# sourceMappingURL=data:application/json;base64,e30\n// foobar', true)).to.eql({
      contents: '\n// foobar',
      sourceMap: {},
    })

    expect(extractSourceMap(path, '//# sourceMappingURL=baz.js.map\n// foobar', false)).to.eql({
      contents: '//# sourceMappingURL=baz.js.map\n// foobar',
      sourceMapFile: '/foo/bar/baz.js.map',
    })

    expect(extractSourceMap(path, '//# sourceMappingURL=baz.js.map\n// foobar', true)).to.eql({
      contents: '\n// foobar',
      sourceMapFile: '/foo/bar/baz.js.map',
    })

    expect(extractSourceMap(path, '//# sourceMappingURL=\n// foobar', false)).to.eql({
      contents: '//# sourceMappingURL=\n// foobar',
    })
    expect(extractSourceMap(path, '//# sourceMappingURL=\n// foobar', true)).to.eql({
      contents: '//# sourceMappingURL=\n// foobar',
    })
  })
})
