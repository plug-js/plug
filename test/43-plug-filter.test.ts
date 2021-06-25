import { expect } from 'chai'
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
    /* file2   */ files.add('Bar.Ts', 'contents')
    /* file3   */ files.add('baz.txt', 'contents')

    const filter = new FilterPlug('**/*.ts')
    const output = await filter.process(files, run, log)
    expect(filter).to.have.property('options').undefined

    expect(output.list()).to.eql([ file1 ])
  })

  it('should filter some files with options', async () => {
    const { files, run, log } = mock('/foo')

    const file1 = files.add('foo.ts', 'contents')
    const file2 = files.add('Bar.Ts', 'contents')
    /* file3   */ files.add('baz.txt', 'contents')

    const options1 = { caseSensitiveMatch: true }
    const filter1 = new FilterPlug('**/*.ts', options1)
    expect(filter1).to.have.property('options').equal(options1)

    const output1 = await filter1.process(files, run, log)

    expect(output1.list()).to.eql([ file1 ])

    const options2 = { caseSensitiveMatch: false }
    const filter2 = new FilterPlug('**/*.ts', options2)
    expect(filter2).to.have.property('options').equal(options2)

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
