import { expect } from 'chai'
import { PlugPipe } from '../src/pipe'
import { FilterPlug } from '../src/plugs/filter'
import { mock } from './support'

describe('Plug Filter Processor', () => {
  it('should be installed', () => {
    expect(new PlugPipe().filter).to.be.a('function')
  })

  it('should filter some files', async () => {
    const { files } = mock('/foo')

    const file0 = files.add('foo.ts', 'contents')
    const file1 = files.add('foo.js', { contents: 'contents', originalFile: file0 })
    /* file2   */ files.add('bar.txt', 'contents')

    const filter = new FilterPlug('**/*.ts')
    const output = await filter.process(files)

    expect(output.list()).to.eql([ file1 ])
  })

  it('should filter some files with options', async () => {
    const { files } = mock('/foo')

    const file0 = files.add('foo.ts', 'contents')
    const file1 = files.add('Bar.Ts', 'contents')
    const file2 = files.add('foo.js', { contents: 'contents', originalFile: file0 })
    const file3 = files.add('Bar.js', { contents: 'contents', originalFile: file1 })
    /* file4   */ files.add('baz.txt', 'contents')

    const options1 = { nocase: false }
    const filter1 = new FilterPlug('**/*.ts', options1)

    const output1 = await filter1.process(files)

    expect(output1.list()).to.eql([ file2 ])

    const options2 = { nocase: true }
    const filter2 = new FilterPlug('**/*.ts', options2)

    const output2 = await filter2.process(files)

    expect(output2.list().sort()).to.eql([ file3, file2 ])
  })

  it('should filter some files matching original paths', () => {
    const { files } = mock('/foo')

    const file0 = files.add('foo.ts', { contents: 'contents' })
    const file1 = files.add('foo.js', { contents: 'contents', originalFile: file0 })
    /* file2   */ files.add('bar.js', { contents: 'contents', originalFile: file1 })

    const filter1 = new FilterPlug('**/*.ts') // default, match originals
    expect(filter1.process(files).list()).to.eql([ file1 ])

    const filter2 = new FilterPlug('**/*.ts', { matchOriginalPaths: true })
    expect(filter2.process(files).list()).to.eql([ file1 ])

    const filter3 = new FilterPlug('**/*.ts', { matchOriginalPaths: false })
    expect(filter3.process(files).list()).to.eql([ file0 ])
  })

  it('should filter some files matching only scripts', () => {
    const { files } = mock('/foo')

    const file0 = files.add('foo.ts', { contents: 'contents' })
    const file1 = files.add('foo.js', { contents: 'contents', originalFile: file0 })
    const file2 = files.add('bar.d.ts', { contents: 'contents', originalFile: file0 })
    const file3 = files.add('bar.js.map', { contents: 'contents', originalFile: file0 })

    const filter1 = new FilterPlug('**/*.ts') // default, match script or not
    expect(filter1.process(files).list()).to.eql([ file1, file2, file3 ])

    const filter2 = new FilterPlug('**/*.ts', { scriptsOnly: true })
    expect(filter2.process(files).list()).to.eql([ file1 ])
  })


  it('should not filter an empty file list', () => {
    const { files } = mock('/foo')
    const filter = new FilterPlug('**/*.ts')
    const output = filter.process(files)
    expect(output).to.equal(files)
  })
})
