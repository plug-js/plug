import { expect } from 'chai'
import { File, Files } from '../src/files'
import { PlugPipe } from '../src/pipe'
import { FilterPlug } from '../src/plugs/filter'
import { mock } from './support'

describe('Plug Filter Processor', () => {
  it('should be installed', () => {
    expect(new PlugPipe().filter).to.be.a('function')
  })

  it('should filter some files', async () => {
    const { files, run, log } = mock('/foo')

    const file1 = files.add('foo.ts', 'contents')
    /* file2   */ files.add('bar.txt', 'contents')

    const filter = new FilterPlug('**/*.ts')
    const output = await filter.process(files, run, log)

    expect(output.list()).to.eql([ file1 ])
  })

  it('should filter some files with options', async () => {
    const { files, run, log } = mock('/foo')

    const file1 = files.add('foo.ts', 'contents')
    const file2 = files.add('Bar.Ts', 'contents')
    /* file3   */ files.add('baz.txt', 'contents')

    const options1 = { nocase: false }
    const filter1 = new FilterPlug('**/*.ts', options1)

    const output1 = await filter1.process(files, run, log)

    expect(output1.list()).to.eql([ file1 ])

    const options2 = { nocase: true }
    const filter2 = new FilterPlug('**/*.ts', options2)

    const output2 = await filter2.process(files, run, log)

    expect(output2.list().sort()).to.eql([ file2, file1 ])
  })

  it('should filter some files matching original paths', () => {
    const { files } = mock('/foo')

    const file0 = files.add('foo.ts', { contents: 'contents' })
    const file1 = files.add('foo.js', { contents: 'contents', originalFile: file0 })
    /* file2   */ files.add('bar.js', { contents: 'contents' })

    const filter = new class extends FilterPlug {
      constructor() {
        super('**/*.ts')
      }

      filter(input: Files, matchOriginals?: boolean): File[] {
        return super.filter(input, matchOriginals)
      }
    }

    expect(filter.filter(files)).to.eql([ file0 ]) // not matching originals
    expect(filter.filter(files, false)).to.eql([ file0 ]) // not matching originals
    expect(filter.filter(files, true)).to.eql([ file1 ]) // match originals
  })

  it('should not filter an empty file list', () => {
    const { files, run, log } = mock('/foo')
    const filter = new FilterPlug('**/*.ts')
    const output = filter.process(files, run, log)
    expect(output).to.equal(files)
  })
})
