import { AssertionError } from 'assert'
import { FilePath } from '../src/utils/paths'
import { expect } from 'chai'
import { FileSourceMap, extractSourceMap, extractSourceMappingURL, parseSourceMappingURL, SOURCE_MAPPING_URL } from '../src/source-maps'
import { MappingItem, RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map'
import { disableLogs, mock } from './support'

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

    expect(extractSourceMap(file, `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foobar`, false)).to.eql({
      contents: `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foobar`,
      sourceMapFile: undefined,
      sourceMap: { file },
    })

    expect(extractSourceMap(file, `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ\n// foobar`, true)).to.eql({
      contents: '\n// foobar',
      sourceMapFile: undefined,
      sourceMap: { file },
    })

    expect(extractSourceMap(file, `//# ${SOURCE_MAPPING_URL}=baz.js.map\n// foobar`, false)).to.eql({
      contents: `//# ${SOURCE_MAPPING_URL}=baz.js.map\n// foobar`,
      sourceMapFile: '/foo/bar/baz.js.map',
      sourceMap: undefined,
    })

    expect(extractSourceMap(file, `//# ${SOURCE_MAPPING_URL}=baz.js.map\n// foobar`, true)).to.eql({
      contents: '\n// foobar',
      sourceMapFile: '/foo/bar/baz.js.map',
      sourceMap: undefined,
    })

    expect(extractSourceMap(file, `//# ${SOURCE_MAPPING_URL}=\n// foobar`, false)).to.eql({
      contents: `//# ${SOURCE_MAPPING_URL}=\n// foobar`,
      sourceMapFile: undefined,
      sourceMap: undefined,
    })

    expect(extractSourceMap(file, `//# ${SOURCE_MAPPING_URL}=\n// foobar`, true)).to.eql({
      contents: `//# ${SOURCE_MAPPING_URL}=\n// foobar`,
      sourceMapFile: undefined,
      sourceMap: undefined,
    })
  })

  describe('File based source maps', () => {
    it('should create a FileSourceMap', () => {
      const file = '/foo/bar.txt' as FilePath

      const sm1 = FileSourceMap.for(file, { version: 3 } as any)
      expect(sm1?.file).to.equal(file)
      expect(sm1?.mappings).to.eql('')
      expect(sm1?.names).to.eql([])
      expect(sm1?.sources).to.eql([])
      expect(sm1?.sourcesContent).to.eql([])

      const sm2 = FileSourceMap.for(file, {
        version: '3',
        mappings: true,
        names: 'foo',
        sources: 'bar',
        sourceContent: 'baz',
      } as any)
      expect(sm2?.file).to.equal(file)
      expect(sm2?.mappings).to.eql('')
      expect(sm2?.names).to.eql([])
      expect(sm2?.sources).to.eql([])
      expect(sm2?.sourcesContent).to.eql([])

      const sm3 = FileSourceMap.for(file, {
        version: '3',
        mappings: 'map',
        names: [ 'foo' ],
        sources: [ 'bar.src' ],
        sourcesContent: [ 1234, 'trim me', 'trim me too' ],
        sourceRoot: '/root',
      } as any)
      expect(sm3?.file).to.equal(file)
      expect(sm3?.mappings).to.eql('map')
      expect(sm3?.names).to.eql([ 'foo' ])
      expect(sm3?.sources).to.eql([ '/root/bar.src' ])
      expect(sm3?.sourcesContent).to.eql([ null ])

      const sm4 = FileSourceMap.for(file, {
        version: '3',
        mappings: 'map',
        sources: [ 'bar.src' ],
        sourcesContent: [ '' ], // empty string, no source!
        sourceRoot: 'root',
      } as any)
      expect(sm4?.file).to.equal(file)
      expect(sm4?.mappings).to.eql('map')
      expect(sm4?.names).to.eql([ ])
      expect(sm4?.sources).to.eql([ '/foo/root/bar.src' ])
      expect(sm4?.sourcesContent).to.eql([ null ])

      const sm5 = FileSourceMap.for(file, {
        version: '3',
        mappings: 'map',
        sources: [ 'bar.src' ],
        // no sources content
        sourceRoot: 'root',
      } as any)
      expect(sm5?.file).to.equal(file)
      expect(sm5?.mappings).to.eql('map')
      expect(sm5?.names).to.eql([ ])
      expect(sm5?.sources).to.eql([ '/foo/root/bar.src' ])
      expect(sm5?.sourcesContent).to.eql([ null ])
    })

    it('should not create a FileSourceMap with invalid data', () => {
      const file = '/foo/bar.txt' as FilePath

      expect(FileSourceMap.for(file, undefined as any)).to.be.undefined
      expect(FileSourceMap.for(file, 'foo bar' as any)).to.be.undefined
      expect(FileSourceMap.for(file, { foo: 'bar' } as any)).to.be.undefined
      expect(FileSourceMap.for(file, { version: 4 } as any)).to.be.undefined
      expect(FileSourceMap.for(file, { version: null } as any)).to.be.undefined
    })

    it('should fail when creating a FileSourceMap with broken data', () => {
      const file = '/foo/bar.txt' as FilePath

      expect(() => FileSourceMap.for(file, { version: 3, names: [ 123 ] } as any))
          .to.throw(AssertionError, 'Invalid name "123" in source map for "/foo/bar.txt"')
      expect(() => FileSourceMap.for(file, { version: 3, sources: [ 123 ] } as any))
          .to.throw(AssertionError, 'Invalid source "123" in source map for "/foo/bar.txt"')
    })

    it('should properly attach sources to a FileSourceMap', () => {
      const file = '/foo/bar.txt' as FilePath
      const sm = FileSourceMap.for(file, {
        version: '3',
        sources: [ 'one.txt', 'two.txt', 'three.txt' ],
        sourcesContent: [ null, 'content for two' ], // three is missing
      } as any)

      expect(sm?.file).to.equal(file)
      expect(sm?.sources).to.eql([ '/foo/one.txt', '/foo/two.txt', '/foo/three.txt' ])
      expect(sm?.sourcesContent).to.eql([ null, 'content for two', null ])
      expect(sm?.attachedSources).to.eql([])

      const { files } = mock('/foo')
      files.add('one.txt', 'one')
      files.add('two.txt', 'two')
      files.add('three.txt', 'three')
      sm?.attachSources(files)

      expect(sm?.sourcesContent).to.eql([ null, 'content for two', null ])
      expect(sm?.attachedSources).to.eql([ {
        absolutePath: '/foo/one.txt',
        originalPath: '/foo/one.txt',
      }, undefined, {
        absolutePath: '/foo/three.txt',
        originalPath: '/foo/three.txt',
      } ])
    })

    it('should produce a simple source map', async () => {
      const { files } = mock('/src')
      files.add('three.txt', { contents: 'content for three' })

      const file = '/foo/bar.txt' as FilePath
      const sm = FileSourceMap.for(file, {
        version: '3',
        mappings: 'mappings',
        sources: [ '/baz/one.txt', 'two.txt', '../src/three.txt' ],
        sourcesContent: [ null, 'content for two' ], // three is missing
      } as any)

      expect(sm?.sourcesContent).to.eql([ null, 'content for two', null ])
      expect(await sm?.produceSourceMap({ combineSourceMaps: false })).to.eql({
        version: 3,
        file: '/foo/bar.txt',
        mappings: 'mappings',
        sources: [ '/baz/one.txt', '/foo/two.txt', '/src/three.txt' ],
        names: [],
      })

      expect(sm?.sourcesContent).to.eql([ null, 'content for two', null ])
      expect(await sm?.produceSourceMap({ combineSourceMaps: false, attachSources: true })).to.eql({
        version: 3,
        file: '/foo/bar.txt',
        mappings: 'mappings',
        sources: [ '/baz/one.txt', '/foo/two.txt', '/src/three.txt' ],
        sourcesContent: [ null, 'content for two', null ],
        names: [],
      })

      sm?.attachSources(files)
      expect(sm?.sourcesContent).to.eql([ null, 'content for two', null ])
      expect(sm?.attachedSources).to.eql([ undefined, undefined, {
        absolutePath: '/src/three.txt',
        originalPath: '/src/three.txt',
      } ])

      expect(await sm?.produceSourceMap({ combineSourceMaps: false, attachSources: true })).to.eql({
        version: 3,
        file: '/foo/bar.txt',
        mappings: 'mappings',
        sources: [ '/baz/one.txt', '/foo/two.txt', '/src/three.txt' ],
        sourcesContent: [ null, 'content for two', 'content for three' ],
        names: [],
      })
    })

    it('should produce a combined source map', async () => {
      const { files } = mock('/sources')

      // this maps result1.txt => source1.txt (content from file)
      files.add('source1.txt', { contents: '1 contents of source1.txt' })
      const generator1 = new SourceMapGenerator()
      generator1.addMapping({
        generated: { line: 11, column: 11 },
        original: { line: 111, column: 111 },
        source: 'source1.txt',
        name: 'originalName1',
      })
      files.add('result1.txt', {
        contents: 'contents of result1.txt',
        sourceMap: generator1.toJSON(),
        sourceMapSources: files,
      })

      // this maps result2.txt => source2.txt (content in the source map)
      files.add('source2.txt', { contents: '2 wrong of source2.txt' })
      const generator2 = new SourceMapGenerator()
      generator2.addMapping({
        generated: { line: 22, column: 22 },
        original: { line: 222, column: 222 },
        source: 'source2.txt',
        name: 'originalName2',
      })
      generator2.setSourceContent('source2.txt', '2 overridden contents of source2.txt')
      files.add('result2.txt', {
        contents: 'contents of result2.txt',
        sourceMap: generator2.toJSON(),
        sourceMapSources: files,
      })

      // this maps result3.txt => source3.txt (content not available)
      const generator3 = new SourceMapGenerator()
      generator3.addMapping({
        generated: { line: 33, column: 33 },
        original: { line: 333, column: 333 },
        source: 'source3.txt',
        name: 'originalName3',
      })
      files.add('result3.txt', {
        contents: '3 contents of result3.txt',
        sourceMap: generator3.toJSON(),
        sourceMapSources: files,
      })

      // this maps combined.txt => [ result1.txt, result2.txt ]
      const generator = new SourceMapGenerator()
      generator.addMapping({ // content from file
        generated: { line: 1, column: 1 },
        original: { line: 11, column: 11 },
        source: '../sources/result1.txt',
        name: 'translatedName1',
      })
      generator.addMapping({ // content from source map
        generated: { line: 2, column: 2 },
        original: { line: 22, column: 22 },
        source: '../sources/result2.txt',
        name: 'translatedName2',
      })
      generator.addMapping({ // content missing
        generated: { line: 3, column: 3 },
        original: { line: 33, column: 33 },
        source: '../sources/result3.txt',
        name: 'translatedName3',
      })
      generator.addMapping({ // missing source file
        generated: { line: 4, column: 4 },
        original: { line: 44, column: 44 },
        source: '../sources/missing.txt',
        name: 'missingName',
      })
      generator.addMapping({ // missing source file, source from source map
        generated: { line: 5, column: 5 },
        original: { line: 55, column: 55 },
        source: '../sources/supplied.txt',
        name: 'suppliedName',
      })
      generator.setSourceContent('../sources/supplied.txt', '5 supplied contents')

      // Create our source map and attach some files to it...
      const sm = FileSourceMap.for('/result/result.txt' as FilePath, generator.toJSON())!
      expect(sm).to.be.an('object')

      // Before attaching sources...
      const result1 = await sm.produceSourceMap({ attachSources: false })
      const result2 = await sm.produceSourceMap({ attachSources: true })
      sm.attachSources(files)
      const result3 = await sm.produceSourceMap({ attachSources: false })
      const result4 = await sm.produceSourceMap({ attachSources: true })

      // ---------------------------------------------------------------
      // SOURCE MAPPINGS - DO THIS FIRST!!! We use sort() for all the
      // arrays below, which is _disruptive_ (sorts in place, not java!)

      async function mappings(sourceMap: RawSourceMap): Promise<Record<number, MappingItem>> {
        return SourceMapConsumer.with(sourceMap, null, (consumer) => {
          const result: Record<number, MappingItem> = {}
          consumer.eachMapping((mapping) => result[mapping.generatedLine] = mapping)
          return result
        })
      }

      expect(await mappings(result1)).to.eql({
        '1': { generatedLine: 1, generatedColumn: 1, lastGeneratedColumn: null, source: '/sources/result1.txt', originalLine: 11, originalColumn: 11, name: 'translatedName1' },
        '2': { generatedLine: 2, generatedColumn: 2, lastGeneratedColumn: null, source: '/sources/result2.txt', originalLine: 22, originalColumn: 22, name: 'translatedName2' },
        '3': { generatedLine: 3, generatedColumn: 3, lastGeneratedColumn: null, source: '/sources/result3.txt', originalLine: 33, originalColumn: 33, name: 'translatedName3' },
        '4': { generatedLine: 4, generatedColumn: 4, lastGeneratedColumn: null, source: '/sources/missing.txt', originalLine: 44, originalColumn: 44, name: 'missingName' },
        '5': { generatedLine: 5, generatedColumn: 5, lastGeneratedColumn: null, source: '/sources/supplied.txt', originalLine: 55, originalColumn: 55, name: 'suppliedName' },
      }).to.eql(await mappings(result2))

      // // after attaching sources they become
      expect(await mappings(result3)).to.eql({
        '1': { generatedLine: 1, generatedColumn: 1, lastGeneratedColumn: null, source: '/sources/source1.txt', originalLine: 111, originalColumn: 111, name: 'originalName1' },
        '2': { generatedLine: 2, generatedColumn: 2, lastGeneratedColumn: null, source: '/sources/source2.txt', originalLine: 222, originalColumn: 222, name: 'originalName2' },
        '3': { generatedLine: 3, generatedColumn: 3, lastGeneratedColumn: null, source: '/sources/source3.txt', originalLine: 333, originalColumn: 333, name: 'originalName3' },
        '4': { generatedLine: 4, generatedColumn: 4, lastGeneratedColumn: null, source: '/sources/missing.txt', originalLine: 44, originalColumn: 44, name: 'missingName' },
        '5': { generatedLine: 5, generatedColumn: 5, lastGeneratedColumn: null, source: '/sources/supplied.txt', originalLine: 55, originalColumn: 55, name: 'suppliedName' },
      }).to.eql(await mappings(result4))

      // ---------------------------------------------------------------
      // BASIC STUFF

      expect(result1.version).to.equal(3)
      expect(result2.version).to.equal(3)
      expect(result3.version).to.equal(3)
      expect(result4.version).to.equal(3)

      expect(result1.file).to.equal('/result/result.txt')
      expect(result2.file).to.equal('/result/result.txt')
      expect(result3.file).to.equal('/result/result.txt')
      expect(result4.file).to.equal('/result/result.txt')

      // ---------------------------------------------------------------
      // NAME TRANSLATION

      expect(result1.names.sort()).to.eql([
        'translatedName1',
        'translatedName2',
        'translatedName3',
        'missingName',
        'suppliedName',
      ].sort()).to.eql(result2.names.sort())

      // after attaching sources they become
      expect(result3.names.sort()).to.eql([
        'originalName1',
        'originalName2',
        'originalName3',
        'missingName',
        'suppliedName',
      ].sort()).to.eql(result4.names.sort())

      // ---------------------------------------------------------------
      // SOURCES TRANSLATION

      expect(result1.sources.sort()).to.eql([
        '/sources/result1.txt',
        '/sources/result2.txt',
        '/sources/result3.txt',
        '/sources/missing.txt',
        '/sources/supplied.txt',
      ].sort()).to.eql(result2.sources.sort())

      // after attaching sources they become
      expect(result3.sources.sort()).to.eql([
        '/sources/source1.txt',
        '/sources/source2.txt',
        '/sources/source3.txt',
        '/sources/missing.txt',
        '/sources/supplied.txt',
      ].sort()).to.eql(result4.sources.sort())

      // ---------------------------------------------------------------
      // ORIGINAL SOURCES TRANSLATION

      expect(result1.sourcesContent).to.be.undefined
      expect(result2.sourcesContent?.sort()).to.eql([
        null,
        null,
        null,
        null,
        '5 supplied contents',
      ].sort())

      // after attaching sources they become
      expect(result3.sourcesContent).to.be.undefined
      expect(result4.sourcesContent?.sort()).to.eql([
        '1 contents of source1.txt',
        '2 overridden contents of source2.txt',
        null,
        null,
        '5 supplied contents',
      ].sort())
    })
  })
})
