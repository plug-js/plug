import { AssertionError } from 'assert'
import { FilePath } from '../src/utils/paths'
import { expect } from 'chai'
import { mock } from './support'
import { FileSourceMap } from '../src/files/sourcemap'
import { Files } from '../src/files'
import { Run } from '../src/run'
import { URL } from 'url'
import { MappingItem, RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map'

describe('File Source Maps', () => {
  const files = Files.for({ project: { directory: '/foo' } } as Run)

  it('should create a FileSourceMap', async () => {
    const file = '/foo/bar.txt' as FilePath

    const sm1 = new FileSourceMap(file, files, { version: 3 } as any)
    expect(sm1.mappings).to.eql('')
    expect(sm1.names).to.eql([])
    expect(sm1.sources).to.eql([])
    expect(sm1.sourcesContent).to.eql([])
    expect(await sm1.readSourcesContent()).to.eql([])

    const sm2 = new FileSourceMap(file, files, {
      version: '3',
      mappings: true,
      names: 'foo',
      sources: 'bar',
      sourceContent: 'baz',
    } as any)
    expect(sm2.mappings).to.eql('')
    expect(sm2.names).to.eql([])
    expect(sm2.sources).to.eql([])
    expect(sm2.sourcesContent).to.eql([])
    expect(sm2.attachedSources).to.eql([])
    expect(await sm2.readSourcesContent()).to.eql([])

    const sm3 = new FileSourceMap(file, files, {
      version: '3',
      mappings: 'map',
      names: [ 'foo' ],
      sources: [ 'bar.src' ],
      sourcesContent: [ 1234, 'trim me', 'trim me too' ],
    } as any)
    expect(sm3.mappings).to.eql('map')
    expect(sm3.names).to.eql([ 'foo' ])
    expect(sm3.sources).to.eql([ new URL('file:///foo/bar.src') ])
    expect(sm3.sourcesContent).to.eql([ null ])
    expect(sm3.attachedSources).to.eql([ undefined ])
    expect(await sm3.readSourcesContent()).to.eql([ null ])

    const sm4 = new FileSourceMap(file, files, {
      version: '3',
      mappings: 'map',
      names: [ 'foo' ],
      sources: [ 'bar.src' ],
      sourcesContent: [ 1234, 'trim me', 'trim me too' ],
      sourceRoot: 'http://example.org/root/',
    } as any)
    expect(sm4.mappings).to.eql('map')
    expect(sm4.names).to.eql([ 'foo' ])
    expect(sm4.sources).to.eql([ new URL('http://example.org/root/bar.src') ])
    expect(sm4.sourcesContent).to.eql([ null ])
    expect(sm4.attachedSources).to.eql([ undefined ])
    expect(await sm4.readSourcesContent()).to.eql([ null ])

    const sm5 = new FileSourceMap(file, files, {
      version: '3',
      mappings: 'map',
      sources: [ 'bar.src' ],
      sourcesContent: [ null ], // no source!
      sourceRoot: '/root/',
    } as any)
    expect(sm5.mappings).to.eql('map')
    expect(sm5.names).to.eql([ ])
    expect(sm5.sources).to.eql([ new URL('file:///root/bar.src') ])
    expect(sm5.sourcesContent).to.eql([ null ])
    expect(sm5.attachedSources).to.eql([ undefined ])
    expect(await sm5.readSourcesContent()).to.eql([ null ])

    const sm6 = new FileSourceMap(file, files, {
      version: '3',
      mappings: 'map',
      sources: [ 'bar.src' ],
      // no sources content
      sourceRoot: 'root/',
    } as any)
    expect(sm6.mappings).to.eql('map')
    expect(sm6.names).to.eql([ ])
    expect(sm6.sources).to.eql([ new URL('file:///foo/root/bar.src') ])
    expect(sm6.sourcesContent).to.eql([ null ]) // no source attached
    expect(sm6.attachedSources).to.eql([ undefined ])
    expect(await sm6.readSourcesContent()).to.eql([ null ])
  })

  it('should not create a FileSourceMap with invalid data', () => {
    const file = '/foo/bar.txt' as FilePath

    expect(() => new FileSourceMap(file, files, undefined as any))
        .to.throw(AssertionError, 'Raw source map from "/foo/bar.txt" is not an object')
    expect(() => new FileSourceMap(file, files, 'foo bar' as any))
        .to.throw(AssertionError, 'Raw source map from "/foo/bar.txt" is not an object')
    expect(() => new FileSourceMap(file, files, { foo: 'bar' } as any))
        .to.throw(AssertionError, 'Invalid source map version in "/foo/bar.txt"')
    expect(() => new FileSourceMap(file, files, { version: 4 } as any))
        .to.throw(AssertionError, 'Invalid source map version in "/foo/bar.txt"')
    expect(() => new FileSourceMap(file, files, { version: null } as any))
        .to.throw(AssertionError, 'Invalid source map version in "/foo/bar.txt"')

    expect(() => new FileSourceMap(file, files, { version: 3, names: [ 123 ] } as any))
        .to.throw(AssertionError, 'Invalid name "123" in source map for "/foo/bar.txt"')
    expect(() => new FileSourceMap(file, files, { version: 3, sources: [ 123 ] } as any))
        .to.throw(AssertionError, 'Invalid source "123" in source map for "/foo/bar.txt"')
  })

  it('should properly attach sources to a FileSourceMap', async () => {
    const { files } = mock('/foo')
    const file = '/foo/bar.txt' as FilePath

    files.add('one.txt', 'one')
    files.add('two.txt', 'two')
    files.add('three.txt', 'three')

    const sm = new FileSourceMap(file, files, {
      version: '3',
      sources: [ '../foo/one.txt', 'two.txt', './bar/../three.txt' ],
      sourcesContent: [ null, 'content for two' ], // three is missing
    } as any)

    expect(sm.sources).to.eql([
      new URL('file:///foo/one.txt'),
      new URL('file:///foo/two.txt'),
      new URL('file:///foo/three.txt'),
    ])

    expect(sm.attachedSources).to.eql([
      { absolutePath: '/foo/one.txt' },
      { absolutePath: '/foo/two.txt' },
      { absolutePath: '/foo/three.txt' },
    ])

    // before reading
    expect(sm.sourcesContent).to.eql([ undefined, 'content for two', undefined ])

    // read
    expect(await sm.readSourcesContent()).to.eql([ 'one', 'content for two', 'three' ])

    // after reading
    expect(sm.sourcesContent).to.eql([ 'one', 'content for two', 'three' ])
  })

  it('should produce a simple source map', async () => {
    const { files } = mock('/src')
    files.add('three.txt', { contents: 'content for three' })

    const file = '/foo/bar.txt' as FilePath
    const sm = new FileSourceMap(file, files, {
      version: '3',
      mappings: 'mappings',
      sources: [ '/baz/one.txt', 'two.txt', '../src/three.txt', 'http://www/my.map' ],
      sourcesContent: [ null, 'content for two' ], // three is missing
    } as any)

    // we haven't read the sources yet
    expect(sm?.sourcesContent).to.eql([ null, 'content for two', undefined, null ])

    // now produce with the same name but no sources
    expect(await sm?.produceSourceMap(file, { combineSourceMaps: false })).to.eql({
      version: 3,
      file: 'bar.txt',
      mappings: 'mappings',
      sources: [ '../baz/one.txt', 'two.txt', '../src/three.txt', 'http://www/my.map' ],
      names: [],
    })

    // we haven't read the sources yet
    expect(sm?.sourcesContent).to.eql([ null, 'content for two', undefined, null ])

    // we now produce under a _different_ path (under /src) with contents
    expect(await sm?.produceSourceMap('/src/bar.txt' as FilePath, { combineSourceMaps: false, attachSources: true })).to.eql({
      version: 3,
      file: 'bar.txt',
      mappings: 'mappings',
      sources: [ '../baz/one.txt', '../foo/two.txt', 'three.txt', 'http://www/my.map' ],
      sourcesContent: [ null, 'content for two', 'content for three', null ],
      names: [],
    })

    // we have indeed read the sources now!
    expect(sm?.sourcesContent).to.eql([ null, 'content for two', 'content for three', null ])
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
    const file = '/result/result.txt' as FilePath
    const sm = new FileSourceMap(file, files, generator.toJSON())!
    expect(sm).to.be.an('object')

    // Before attaching sources...
    const result1 = await sm.produceSourceMap(file) // default, combine, do not attach!
    const result2 = await sm.produceSourceMap(file, { attachSources: true })

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
      '1': { generatedLine: 1, generatedColumn: 1, lastGeneratedColumn: null, source: '../sources/source1.txt', originalLine: 111, originalColumn: 111, name: 'originalName1' },
      '2': { generatedLine: 2, generatedColumn: 2, lastGeneratedColumn: null, source: '../sources/source2.txt', originalLine: 222, originalColumn: 222, name: 'originalName2' },
      '3': { generatedLine: 3, generatedColumn: 3, lastGeneratedColumn: null, source: '../sources/source3.txt', originalLine: 333, originalColumn: 333, name: 'originalName3' },
      '4': { generatedLine: 4, generatedColumn: 4, lastGeneratedColumn: null, source: '../sources/missing.txt', originalLine: 44, originalColumn: 44, name: 'missingName' },
      '5': { generatedLine: 5, generatedColumn: 5, lastGeneratedColumn: null, source: '../sources/supplied.txt', originalLine: 55, originalColumn: 55, name: 'suppliedName' },
    }).to.eql(await mappings(result2))


    // ---------------------------------------------------------------
    // BASIC STUFF

    expect(result1.version).to.equal(3)
    expect(result2.version).to.equal(3)

    expect(result1.file).to.equal('result.txt')
    expect(result2.file).to.equal('result.txt')

    // ---------------------------------------------------------------
    // NAME TRANSLATION

    expect(result1.names.sort()).to.eql([
      'originalName1',
      'originalName2',
      'originalName3',
      'missingName',
      'suppliedName',
    ].sort()).to.eql(result2.names.sort())

    // ---------------------------------------------------------------
    // SOURCES TRANSLATION

    expect(result1.sources.sort()).to.eql([
      '../sources/source1.txt',
      '../sources/source2.txt',
      '../sources/source3.txt',
      '../sources/missing.txt',
      '../sources/supplied.txt',
    ].sort()).to.eql(result2.sources.sort())

    // ---------------------------------------------------------------
    // ORIGINAL SOURCES TRANSLATION

    expect(result1.sourcesContent).to.be.undefined
    expect(result2.sourcesContent?.sort()).to.eql([
      '1 contents of source1.txt',
      '2 overridden contents of source2.txt',
      null,
      null,
      '5 supplied contents',
    ].sort())
  })
})
