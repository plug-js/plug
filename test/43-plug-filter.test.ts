import { expect } from 'chai'
import { FilterPlug } from '../src/plugs/filter'
import { FilterOptions } from '../src/types/globs'
import { mock } from './support'

describe('Plug Filter Processor', () => {
  it('should filter some files', async () => {
    const { files, run, log } = mock('/foo')

    const file1 = files.add('foo.ts', 'contents')
    /* file2   */ files.add('Bar.Ts', 'contents')
    /* file3   */ files.add('baz.txt', 'contents')

    const filter = new class extends FilterPlug {
      constructor() {
        super('**/*.ts')
      }
      getOptions(): FilterOptions | undefined {
        return this.options
      }
    }
    const output = await filter.process(files, run, log)
    expect(filter.getOptions()).to.be.undefined

    expect(output.list()).to.eql([ file1 ])
  })

  it('should filter some files with options', async () => {
    const { files, run, log } = mock('/foo')

    const file1 = files.add('foo.ts', 'contents')
    const file2 = files.add('Bar.Ts', 'contents')
    /* file3   */ files.add('baz.txt', 'contents')

    const options1 = { caseSensitiveMatch: true }
    const filter1 = new class extends FilterPlug {
      constructor() {
        super('**/*.ts', options1)
      }
      getOptions(): FilterOptions | undefined {
        return this.options
      }
    }
    expect(filter1.getOptions()).to.equal(options1)

    const output1 = await filter1.process(files, run, log)

    expect(output1.list()).to.eql([ file1 ])

    const filter2 = new FilterPlug('**/*.ts', { caseSensitiveMatch: false })
    const output2 = await filter2.process(files, run, log)

    expect(output2.list().sort()).to.eql([ file2, file1 ])
  })

  it('should not filter an empty file list', () => {
    const { files, run, log } = mock('/foo')
    const filter = new FilterPlug('**/*.ts', { caseSensitiveMatch: true })
    const output = filter.process(files, run, log)
    expect(output).to.equal(files)
  })
})
