import { FilePath } from '../src/utils/paths'
import { expect } from 'chai'
import { extractSourceMappingURL, parseSourceMappingURL, SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { disableLogs } from './support'

describe.skip('Source Maps', () => {
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
    const file = '/foo/bar/baz.js' as FilePath

    expect(parseSourceMappingURL(file)).to.eql({})

    expect(parseSourceMappingURL(file, 'http://www/')).to.eql({})

    expect(parseSourceMappingURL(file, 'file:///foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, '/foo/bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, '../bar/baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, './baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })
    expect(parseSourceMappingURL(file, 'baz.js.map')).to.eql({ sourceMapFile: '/foo/bar/baz.js.map' })

    expect(parseSourceMappingURL(file, 'data:application/json;base64,eyJ2ZXJzaW9uIjozfQ==')).to.eql({ rawSourceMap: { version: 3 } })
    expect(parseSourceMappingURL(file, 'data:application/json;base64,eyJ2ZXJzaW9uIjozfQ')).to.eql({ rawSourceMap: { version: 3 } })
    expect(() => parseSourceMappingURL(file, 'data:application/json;base64,')).to.throw(SyntaxError)
  })
})
