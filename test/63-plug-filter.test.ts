import { expect } from 'chai'
import { PlugPipe } from '../src/pipe'
import { FilterPlug } from '../src/plugs/filter'
import { mock } from './support'

describe('Plug Filter Processor', () => {
  it('should be installed', () => {
    expect(new PlugPipe().filter).to.be.a('function')
  })

  it('should filter some files', () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    /* file2   */ files.add('bar.txt', 'contents')

    const filter = new FilterPlug('**/*.ts')
    const output = filter.process(files)

    expect(output.list()).to.eql([ file1 ])
  })

  it('should filter some files with options', () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    const file2 = files.add('Bar.Ts', { contents: 'contents' })
    /* file3   */ files.add('baz.txt', 'contents')

    const filter1 = new FilterPlug('**/*.ts', { nocase: false })

    const output1 = filter1.process(files)

    expect(output1.list()).to.eql([ file1 ])

    const filter2 = new FilterPlug('**/*.ts', { nocase: true })

    const output2 = filter2.process(files)

    expect(output2.list()).to.eql([ file1, file2 ])
  })

  it('should filter some files matching original file paths', () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    const file2 = files.add('foo.js', { contents: 'contents', originalFile: file1 })
    /* file3   */ files.add('bar.js', { contents: 'contents', originalFile: file2 })

    const filter1 = new FilterPlug('**/*.ts') // default, don't match originals
    expect(filter1.process(files).list()).to.eql([ file1 ])

    const filter2 = new FilterPlug('**/*.ts', { matchOriginalPaths: true })
    expect(filter2.process(files).list()).to.eql([ file2 ])

    const filter3 = new FilterPlug('**/*.ts', { matchOriginalPaths: false })
    expect(filter3.process(files).list()).to.eql([ file1 ])
  })

  it('should filter some files matching only scripts', () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    const file2 = files.add('foo.js', { contents: 'contents', originalFile: file1 })
    const file3 = files.add('bar.d.ts', { contents: 'contents', originalFile: file1 })
    /* file4   */ files.add('bar.js.map', { contents: 'contents', originalFile: file1 })

    const filter1 = new FilterPlug('**/*.ts') // default, match script or not
    expect(filter1.process(files).list()).to.eql([ file1, file3 ])

    const filter2 = new FilterPlug('**/*.ts', { scriptsOnly: true })
    expect(filter2.process(files).list()).to.eql([ ])

    const filter3 = new FilterPlug('**/*.ts', { scriptsOnly: true, matchOriginalPaths: true })
    expect(filter3.process(files).list()).to.eql([ file2 ])
  })

  it('should not filter an empty file list', () => {
    const { files } = mock('/foo')
    const filter = new FilterPlug('**/*.ts')
    const output = filter.process(files)
    expect(output).to.equal(files)
  })
})
