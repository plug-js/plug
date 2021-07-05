import { expect } from 'chai'
import { readFileSync } from 'fs'
import { RawSourceMap } from 'source-map'
import { PlugPipe } from '../src/pipe'
import { WritePlug } from '../src/plugs/write'
import { SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { mktempdir } from '../src/utils/mktempdir'
import { FilePath } from '../src/utils/paths'
import { rmdirs } from '../src/utils/rmdirs'
import { mock, directory } from './support'

describe('Plug Write Processor', () => {
  const sourceMap = { version: 3, mappings: 'mappings' } as RawSourceMap

  const { files, run, log } = mock('/foo')
  files.add('generated.txt', { contents: 'source', sourceMap })

  const external = `source\n//# ${SOURCE_MAPPING_URL}=generated.txt.map`
  const json = '{"version":3,"file":"generated.txt","sources":[],"names":[],"mappings":"mappings"}'
  const inline = `source\n//# ${SOURCE_MAPPING_URL}=data:application/json;base64,${Buffer.from(json).toString('base64')}`

  it('should be installed', () => {
    expect(new PlugPipe().write).to.be.a('function')
  })

  it('should write with an inline source map', async () => {
    // default should be "inline" and no directory... no constructor
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      async write(path: FilePath, contents: string): Promise<void> {
        written[path] = await contents
      }
    }
    const output = await writer.process(files, run, log)
    expect(output).to.equal(files)

    expect(written).to.eql({
      '/foo/generated.txt': inline,
    })
  })

  it('should write with an external source map', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super({ sourceMaps: 'external' })
      }
      async write(path: FilePath, contents: string): Promise<void> {
        written[path] = await contents
      }
    }

    const output = await writer.process(files, run, log)
    expect(output).to.equal(files)

    expect(written).to.eql({
      '/foo/generated.txt': external,
      '/foo/generated.txt.map': json,
    })
  })

  it('should write without source maps', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super({ sourceMaps: 'none' })
      }
      async write(path: FilePath, contents: string): Promise<void> {
        written[path] = await contents
      }
    }

    const output = await writer.process(files, run, log)
    expect(output).to.equal(files)

    expect(written).to.eql({
      '/foo/generated.txt': 'source',
    })
  })

  it('should write in a directory with an inline source map', async () => {
    // default should be "inline" and no directory... no constructor
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super('bar')
      }
      async write(path: FilePath, contents: string): Promise<void> {
        written[path] = await contents
      }
    }
    const output = await writer.process(files, run, log)
    expect(output).to.equal(files)

    expect(written).to.eql({
      '/foo/bar/generated.txt': inline,
    })
  })

  it('should write in a directory with an external source map', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super('bar', { sourceMaps: 'external' })
      }
      async write(path: FilePath, contents: string): Promise<void> {
        written[path] = await contents
      }
    }

    const output = await writer.process(files, run, log)
    expect(output).to.equal(files)

    expect(written).to.eql({
      '/foo/bar/generated.txt': external,
      '/foo/bar/generated.txt.map': json,
    })
  })

  it('should write in a directory without source maps', async () => {
    const written: Record<string, string> = {}
    const writer = new class extends WritePlug {
      constructor() {
        super('bar', { sourceMaps: 'none' })
      }
      async write(path: FilePath, contents: string): Promise<void> {
        written[path] = await contents
      }
    }

    const output = await writer.process(files, run, log)
    expect(output).to.equal(files)

    expect(written).to.eql({
      '/foo/bar/generated.txt': 'source',
    })
  })

  it('should write come content to the filesystem', async () => {
    const dir = await mktempdir({ directory } as any)
    const { files, run, log } = mock(dir)
    const file = files.add('foo/bar/baz.txt', { contents: 'contents...' })
    try {
      const writer = new WritePlug()
      await writer.process(files, run, log)

      const contents = readFileSync(file.absolutePath, 'utf8')
      expect(contents).to.equal('contents...')
    } finally {
      await rmdirs(dir)
    }
  })
})
