import { expect } from 'chai'
import { filter } from '../src/utils/filter'
import { DirectoryPath } from '../src/utils/paths'
import { mock } from './support'

describe('Plug Filter Processor', () => {
  it('should filter some files', async () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    /* file2   */ files.add('bar.txt', 'contents')

    const output = [ ...filter(files.directory, files, '**/*.ts') ]

    expect(output).to.eql([ file1 ])
  })

  it('should filter some files with options', async () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    const file2 = files.add('Bar.Ts', { contents: 'contents' })
    /* file3   */ files.add('baz.txt', 'contents')

    const output1 = [ ...filter(files.directory, files, '**/*.ts', { nocase: false }) ]

    expect(output1).to.eql([ file1 ])

    const output2 = [ ...filter(files.directory, files, '**/*.ts', { nocase: true }) ]

    expect(output2).to.eql([ file1, file2 ])
  })

  it('should filter some files matching original file paths', () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    const file2 = files.add('foo.js', { contents: 'contents', originalFile: file1 })
    /* file3   */ files.add('bar.js', { contents: 'contents', originalFile: file2 })

    const output1 = [ ...filter(files.directory, files, '**/*.ts') ] // default, do not match originals
    expect(output1).to.eql([ file1 ])

    const output2 = [ ...filter(files.directory, files, '**/*.ts', { matchOriginalPaths: true }) ]
    expect(output2).to.eql([ file2 ])

    const output3 = [ ...filter(files.directory, files, '**/*.ts', { matchOriginalPaths: false }) ]
    expect(output3).to.eql([ file1 ])
  })

  it('should filter some files matching only scripts', () => {
    const { files } = mock('/foo')

    const file1 = files.add('foo.ts', { contents: 'contents' })
    const file2 = files.add('foo.js', { contents: 'contents', originalFile: file1 })
    const file3 = files.add('bar.d.ts', { contents: 'contents', originalFile: file1 })
    /* file4   */ files.add('bar.js.map', { contents: 'contents', originalFile: file1 })

    const output1 = [ ...filter(files.directory, files, '**/*.ts') ] // default, match script or not
    expect(output1).to.eql([ file1, file3 ])

    const output2 = [ ...filter(files.directory, files, '**/*.ts', { scriptsOnly: true }) ]
    expect(output2).to.eql([])

    const output3 = [ ...filter(files.directory, files, '**/*.ts', { scriptsOnly: true, matchOriginalPaths: true }) ]
    expect(output3).to.eql([ file2 ])
  })

  it('should filter in subdirectories', async () => {
    const { files } = mock('/foo')

    const file1 = files.add('bar/bar.ts', 'contents')
    /* file2   */ files.add('baz/baz.ts', 'contents')

    const output = [ ...filter('/foo/bar' as DirectoryPath, files, '**/*.ts') ]

    expect(output).to.eql([ file1 ])
  })
})
