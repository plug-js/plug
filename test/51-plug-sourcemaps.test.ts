import { expect } from 'chai'
import { RawSourceMap } from 'source-map'
import { SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { File } from '../src/files'
import { Files } from '../src/files'
import { PlugPipe } from '../src/pipe'
import { SourceMapsPlug } from '../src/plugs/sourcemaps'
import { Log } from '../src/utils/log'
import { mock } from './support'
import { createFilePath, FilePath } from '../src/utils/paths'

describe('Plug Surcemaps Processor', () => {
  it('should be installed', () => {
    expect(new PlugPipe().sourcemaps).to.be.a('function')
  })

  it('should prepare an inline source map', async () => {
    // default should be "inline"... no constructor
    const processor = new class extends SourceMapsPlug {
      processFile(file: File, target: FilePath, files: Files, log: Log): Promise<File[]> {
        return super.processFile(file, target, files, log)
      }
    }

    const { files: input, log } = mock('/foo/source')
    const { files: output } = mock('/foo')

    const file = input.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
      sources: [ './more/original.txt' ],
    } as RawSourceMap })

    const target = createFilePath(output.directory, 'target', 'output.txt')
    const files = await processor.processFile(file, target, output, log)
    expect(files).to.be.an('array').with.length(1)

    const outFile = files[0]

    expect(outFile.absolutePath).to.equal('/foo/target/output.txt')

    const needle = `source\n//# ${SOURCE_MAPPING_URL}=data:application/json;base64,`
    const haystack = outFile.contentsSync()
    expect(haystack.indexOf(needle)).to.equal(0)

    const base64 = haystack.substr(needle.length)
    const json = Buffer.from(base64, 'base64').toString('utf8')

    expect(JSON.parse(json)).to.eql({
      version: 3,
      file: 'output.txt',
      sources: [ '../source/more/original.txt' ],
      mappings: '',
      names: [],
    })
  })

  it('should prepare an external source map', async () => {
    const processor = new class extends SourceMapsPlug {
      constructor() {
        super({ // test other non-default stuff!
          sourceMaps: 'external',
          sourceRoot: 'https://example.org/bar/',
          attachSources: true,
        })
      }
      processFile(file: File, target: FilePath, files: Files, log: Log): Promise<File[]> {
        return super.processFile(file, target, files, log)
      }
    }

    const { files: input, log } = mock('/foo')
    const { files: output } = mock('/foo')

    input.add('target/original.txt', { contents: 'original', sourceMap: false })
    const file = input.add('generated.txt', {
      contents: 'source',
      sourceMap: {
        version: 3,
        sources: [ 'target/original.txt' ], // check normalization of paths
      } as RawSourceMap,
    })

    const target = createFilePath(output.directory, 'target', 'output.txt')
    const files = await processor.processFile(file, target, output, log)
    expect(files).to.be.an('array').with.length(2)

    const [ mapFile, outFile ] = files

    expect(outFile.absolutePath).to.equal('/foo/target/output.txt')
    expect(outFile.contentsSync()).to.equal(`source\n//# ${SOURCE_MAPPING_URL}=output.txt.map`)

    expect(mapFile.absolutePath).to.equal('/foo/target/output.txt.map')
    expect(JSON.parse(mapFile.contentsSync())).to.eql({
      version: 3,
      file: 'output.txt',
      sources: [ './original.txt' ],
      sourceRoot: 'https://example.org/bar/',
      sourcesContent: [ 'original' ],
      mappings: '',
      names: [],
    })
  })

  it('should emit no sourcemaps but preserve them in files', async () => {
    // default should be "inline"... no constructor
    const processor = new SourceMapsPlug({ sourceMaps: 'none' })

    const { files, run, log } = mock('/foo')

    // supplied source map
    files.add('supplied.txt', { contents: 'supplied...', sourceMap: {
      version: 3,
      sources: [ '../sources/supplied.src' ],
    } as RawSourceMap })
    files.add('missing.txt', { contents: 'missing...', sourceMap: false })

    const output = await processor.process(files, run, log)
    expect(output).to.have.length(2)

    const [ supplied, missing ] = output.list()

    expect(supplied.absolutePath).to.equal('/foo/supplied.txt')
    expect(supplied.contentsSync()).to.equal('supplied...')
    expect(await supplied.sourceMapSync()?.produceSourceMap()).to.eql({
      version: 3,
      file: '/foo/supplied.txt',
      sources: [ '/sources/supplied.src' ],
      mappings: '',
      names: [],
    })

    expect(missing.absolutePath).to.equal('/foo/missing.txt')
    expect(missing.contentsSync()).to.equal('missing...')
    expect(await missing.sourceMapSync()).to.be.undefined
  })
})
