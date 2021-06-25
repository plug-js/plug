import { expect } from 'chai'
import { FilterPlug } from '../src/plugs/filter'
import { mock } from './support'

describe('Plug Filter Processor', () => {
  it('should filter some files', () => {
    const { files, run, log } = mock('/foo')

    const file1 = files.add('foo.ts', 'contents')
    /* file2   */ files.add('Bar.Ts', 'contents')
    /* file3   */ files.add('baz.txt', 'contents')

    const filter = new FilterPlug('**/*.ts')
    const output = filter.process(files, run, log)

    expect(output.list()).to.eql([ file1 ])
  })

  it('should filter some files with options', () => {
    const { files, run, log } = mock('/foo')

    const file1 = files.add('foo.ts', 'contents')
    const file2 = files.add('Bar.Ts', 'contents')
    /* file3   */ files.add('baz.txt', 'contents')

    const filter1 = new FilterPlug('**/*.ts', { caseSensitiveMatch: true })
    const output1 = filter1.process(files, run, log)

    expect(output1.list()).to.eql([ file1 ])

    const filter2 = new FilterPlug('**/*.ts', { caseSensitiveMatch: false })
    const output2 = filter2.process(files, run, log)

    expect(output2.list().sort()).to.eql([ file2, file1 ])
  })
})
