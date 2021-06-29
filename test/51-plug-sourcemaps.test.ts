import { expect } from 'chai'
import { RawSourceMap } from 'source-map'
import { SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { PlugPipe } from '../src/pipe'
import { SourceMapsPlug } from '../src/plugs/sourcemaps'
import { mock } from './support'

describe('Plug Surcemaps Processor', () => {
  it('should be installed', () => {
    expect(new PlugPipe().sourcemaps).to.be.a('function')
  })

  it('should prepare an inline source map', async () => {
    // default should be "inline"... no constructor
    const processor = new SourceMapsPlug()

    const { files, run, log } = mock('/foo')

    files.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
    } as RawSourceMap })

    const output = await processor.process(files, run, log)

    expect(output.list().length).to.equal(1)

    // predictable output, we sort our JSON fields
    const file = await output.get('generated.txt')!
    expect(await file.contents()).to.equal(`source\n//# ${SOURCE_MAPPING_URL}=data:application/json;base64,` +
        'eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLnR4dCIsInNvdXJjZXMiOltdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIn0=')
  })

  it('should prepare an external source map', async () => {
    // default should be "inline"... no constructor
    const processor = new SourceMapsPlug({ sourceMaps: 'external' })

    const { files, run, log } = mock('/foo')

    files.add('generated.txt', { contents: 'source', sourceMap: {
      version: 3,
    } as RawSourceMap })

    const output = await processor.process(files, run, log)

    expect(output.list().length).to.equal(2)

    expect(await output.get('generated.txt')!.contents())
        .to.equal(`source\n//# ${SOURCE_MAPPING_URL}=generated.txt.map`)
    expect(JSON.parse(await output.get('generated.txt.map')!.contents())).to.eql({
      version: 3,
      file: 'generated.txt',
      mappings: '',
      names: [],
      sources: [],
    })
  })
})
