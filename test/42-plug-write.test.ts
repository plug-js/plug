import { expect } from 'chai'
import { existsSync, mkdtempSync, rmdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { RawSourceMap } from 'source-map'
import { File } from '../src/files'
import { PlugPipe } from '../src/pipe'
import { WritePlug } from '../src/plugs/write'
import { SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { Log } from '../src/utils/log'
import { getParent, DirectoryPath } from '../src/utils/paths'
import { mock } from './support'

describe('Plug Write Processor', () => {
  it('should be installed', () => {
    expect(new PlugPipe().write).to.be.a('function')
  })

  it('should write with an inline source map', async () => {
    // default should be "inline" and no directory... no constructor
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      async write(file: File): Promise<void> {
        written[file.absolutePath] = await file.contents()
      }
    }

    const { files: input, run, log } = mock('/foo')

    input.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
      sources: [ './more/original.txt' ],
    } as RawSourceMap })

    const output = await writer.process(input, run, log)
    expect(output).to.have.length(1)

    const outFile = output.get('/foo/generated.txt')!

    const needle = `source\n//# ${SOURCE_MAPPING_URL}=data:application/json;base64,`
    const haystack = outFile.contentsSync()
    expect(haystack.indexOf(needle)).to.equal(0)

    const base64 = haystack.substr(needle.length)
    const json = Buffer.from(base64, 'base64').toString('utf8')

    expect(JSON.parse(json)).to.eql({
      version: 3,
      file: 'generated.txt',
      sources: [ './more/original.txt' ],
      mappings: '',
      names: [],
    })

    expect(written).to.eql({
      '/foo/generated.txt': outFile.contentsSync(),
    })
  })

  it('should write with an external source map', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super({ sourceMaps: 'external' })
      }
      async write(file: File): Promise<void> {
        written[file.absolutePath] = await file.contents()
      }
    }

    const { files: input, run, log } = mock('/foo')

    input.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
      sources: [ './more/original.txt' ],
    } as RawSourceMap })

    const output = await writer.process(input, run, log)
    expect(output).to.have.length(2)

    const outFile = output.get('/foo/generated.txt')!
    const mapFile = output.get('/foo/generated.txt.map')!

    expect(outFile.contentsSync()).to.equal(`source\n//# ${SOURCE_MAPPING_URL}=generated.txt.map`)
    expect(JSON.parse(mapFile.contentsSync())).to.eql({
      version: 3,
      file: 'generated.txt',
      sources: [ './more/original.txt' ],
      mappings: '',
      names: [],
    })

    expect(written).to.eql({
      '/foo/generated.txt': outFile.contentsSync(),
      '/foo/generated.txt.map': mapFile.contentsSync(),
    })
  })

  it('should write in a directory with an external source map', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super('bar', { sourceMaps: 'external' })
      }
      async write(file: File): Promise<void> {
        written[file.absolutePath] = await file.contents()
      }
    }

    const { files: input, run, log } = mock('/foo')

    input.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
      sources: [ './more/original.txt' ],
    } as RawSourceMap })

    const output = await writer.process(input, run, log)
    expect(output).to.have.length(2)

    const outFile = output.get('/foo/bar/generated.txt')!
    const mapFile = output.get('/foo/bar/generated.txt.map')!

    expect(outFile.contentsSync()).to.equal(`source\n//# ${SOURCE_MAPPING_URL}=generated.txt.map`)
    expect(JSON.parse(mapFile.contentsSync())).to.eql({
      version: 3,
      file: 'generated.txt',
      sources: [ '../more/original.txt' ],
      mappings: '',
      names: [],
    })

    expect(written).to.eql({
      '/foo/bar/generated.txt': outFile.contentsSync(),
      '/foo/bar/generated.txt.map': mapFile.contentsSync(),
    })
  })

  it('should write without source maps', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super({ sourceMaps: 'none' })
      }
      async write(file: File): Promise<void> {
        written[file.absolutePath] = await file.contents()
      }
    }

    const { files: input, run, log } = mock('/foo')

    const inFile = input.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
      sources: [ './more/original.txt' ],
    } as RawSourceMap })

    const output = await writer.process(input, run, log)
    expect(output).to.equal(input)
    expect(output).to.have.length(1)

    const outFile = output.get('/foo/generated.txt')!
    expect(outFile).to.equal(inFile)

    expect(outFile.contentsSync()).to.equal('source')

    expect(written).to.eql({
      '/foo/generated.txt': outFile.contentsSync(),
    })
  })

  it('should write in a directory without source maps', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super('bar', { sourceMaps: 'none' })
      }
      async write(file: File): Promise<void> {
        written[file.absolutePath] = await file.contents()
      }
    }

    const { files: input, run, log } = mock('/foo')

    input.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
      sources: [ './more/original.txt' ],
    } as RawSourceMap })

    const output = await writer.process(input, run, log)
    expect(output).to.have.length(1)

    const outFile = output.get('/foo/bar/generated.txt')!

    expect(outFile.contentsSync()).to.equal('source')

    expect(written).to.eql({
      '/foo/bar/generated.txt': outFile.contentsSync(),
    })
  })

  it('should write come content to the filesystem', async () => {
    const dir = mkdtempSync(tmpdir()) as DirectoryPath
    const { files, log } = mock(dir)
    const file = files.add('foo/bar/baz.txt', { contents: 'contents...' })
    try {
      const writer = new class extends WritePlug {
        async write(file: File, log: Log): Promise<void> {
          return super.write(file, log)
        }
      }
      await writer.write(file, log)
    } finally {
      if (existsSync(file.absolutePath)) rmSync(file.absolutePath)
      for (let parent = getParent(file.absolutePath); parent != dir; parent = getParent(parent)) {
        if (existsSync(parent)) rmdirSync(parent)
      }
      if (existsSync(dir)) rmdirSync(dir)
    }
  })
})
