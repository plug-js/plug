import { FilePath } from '../src/utils/paths'
import { expect } from 'chai'
import { appendSourceMap, encodeSourceMap, extractSourceMappingURL, parseSourceMappingURL, SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { disableLogs } from './support'
import { RawSourceMap } from 'source-map'

describe('Source Maps', () => {
  disableLogs()

  it('should extract a source mapping url', () => {
    expect(extractSourceMappingURL('foobar', false))
        .to.eql({ contents: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL}=foobar`, false))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL}=foobar`, url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = foobar `, false))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL} = foobar `, url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = `, false))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL} = ` })


    expect(extractSourceMappingURL('foobar\n// barfoo', false))
        .to.eql({ contents: 'foobar\n// barfoo' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL}=foobar\n// barfoo`, false))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL}=foobar\n// barfoo`, url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = foobar \n// barfoo`, false))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL} = foobar \n// barfoo`, url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = \n// barfoo`, false))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL} = \n// barfoo` })
  })

  it('should extract and wipe source mapping url', () => {
    expect(extractSourceMappingURL('foobar', true))
        .to.eql({ contents: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL}=foobar`, true))
        .to.eql({ contents: '', url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = foobar `, true))
        .to.eql({ contents: '', url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = `, true))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL} = ` })

    expect(extractSourceMappingURL('foobar\n// barfoo', true))
        .to.eql({ contents: 'foobar\n// barfoo' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL}=foobar\n// barfoo`, true))
        .to.eql({ contents: '\n// barfoo', url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = foobar \n// barfoo`, true))
        .to.eql({ contents: '\n// barfoo', url: 'foobar' })
    expect(extractSourceMappingURL(`//# ${SOURCE_MAPPING_URL} = \n// barfoo`, true))
        .to.eql({ contents: `//# ${SOURCE_MAPPING_URL} = \n// barfoo` })
  })

  it('should parse a source mapping URL', () => {
    const path = '/foo/bar/baz.js' as FilePath

    expect(parseSourceMappingURL(path)).to.eql({})

    expect(parseSourceMappingURL(path, 'http://www/')).to.eql({})

    expect(parseSourceMappingURL(path, 'file:///foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, '/foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, '../bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, './baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(path, 'baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })

    expect(parseSourceMappingURL(path, 'data:application/json;base64,eyJ2ZXJzaW9uIjozfQ==')).to.eql({ rawSourceMap: { version: 3 } })
    expect(parseSourceMappingURL(path, 'data:application/json;base64,eyJ2ZXJzaW9uIjozfQ')).to.eql({ rawSourceMap: { version: 3 } })
    expect(() => parseSourceMappingURL(path, 'data:application/json;base64,')).to.throw(SyntaxError)
  })

  it('should encode a source map', () => {
    const sm1 = {
      version: 3,
      file: 'file.txt',
      sources: [ 'source1.txt', 'source2.txt' ],
      names: [ 'name1', 'name2' ],
      mappings: 'mappings',
      sourceRoot: 'root',
    }

    const text1 = encodeSourceMap(sm1)
    expect(JSON.parse(text1)).to.eql(sm1)
    expect(text1).to.match(/^{"version":3,"file":"file.txt"/)

    const text2 = encodeSourceMap({ version: 3 } as any)
    expect(JSON.parse(text2)).to.eql({
      version: 3,
      mappings: '',
      sources: [],
      names: [],
    })

    const text3 = encodeSourceMap({
      version: 3,
      sources: [ 's1.txt', 's2.txt' ],
      sourcesContent: [ 'source', null ],
    } as any)
    expect(JSON.parse(text3)).to.eql({
      version: 3,
      mappings: '',
      sources: [ 's1.txt', 's2.txt' ],
      sourcesContent: [ 'source', null ],
      names: [],
    })
  })

  it('should append a source map to some contents', () => {
    const map: RawSourceMap = { version: 3, file: 'baz.js', sources: [], names: [], mappings: '' }

    const [ ecode, emap ] = appendSourceMap('some code...', map, false)
    expect(ecode).to.equal(`some code...\n//# ${SOURCE_MAPPING_URL}=baz.js.map`)
    expect(emap).to.equal('{"version":3,"file":"baz.js","sources":[],"names":[],"mappings":""}')

    const [ icode, imap ] = appendSourceMap('some code...', map, true) as any
    expect(icode).to.equal(`some code...\n//# ${SOURCE_MAPPING_URL}=data:application/json;base64,` +
      'eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF6LmpzIiwic291cmNlcyI6W10sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiIifQ==')
    expect(imap).to.be.undefined
  })
})
