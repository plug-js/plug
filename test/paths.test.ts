import { expect } from 'chai'
import {
  AbsolutePath,
  RelativePath,
  DirectoryPath,
  getRelativePath,
  getCanonicalPath,
  getAbsolutePath,
  getCurrentDirectoryPath,
  getDirectoryPath,
  getDirectory,
  caseSensitivePaths,
} from '../src/utils/paths'

describe('Paths', () => {
  const dir = '/foo/bar' as DirectoryPath
  const file = '/foo/bar/baz.txt' as AbsolutePath
  const relative = 'baz.txt' as RelativePath

  it('should return the current working directory', () => {
    expect(getCurrentDirectoryPath()).to.equal(process.cwd())
  })

  it('should get a directory path', () => {
    expect(getDirectoryPath(dir)).to.equal('/foo/bar')
    expect(getDirectoryPath(dir, '.')).to.equal('/foo/bar')
    expect(getDirectoryPath(dir, 'baz')).to.equal('/foo/bar/baz')
    expect(getDirectoryPath(dir, './baz')).to.equal('/foo/bar/baz')
    expect(getDirectoryPath(dir, '../baz')).to.equal('/foo/baz')
  })

  it('should get an absolute path', () => {
    expect(getAbsolutePath(dir, 'baz.txt')).to.equal(file)
    expect(getAbsolutePath(dir, './baz.txt')).to.equal(file)
    expect(getAbsolutePath(dir, '../baz.txt')).to.equal('/foo/baz.txt')
  })

  it('should get a directory for a file', () => {
    expect(getDirectory(file)).to.equal(dir)
  })

  it('should get a relative path for a file', () => {
    expect(getRelativePath(dir, file)).to.equal(relative)
  })

  it('should canonicalize a file name', () => {
    if (caseSensitivePaths) {
      expect(getCanonicalPath('/FOO/BAR/BAZ.TXT' as AbsolutePath)).to.equal('/FOO/BAR/BAZ.TXT')
      expect(getCanonicalPath('/foo/bar/baz.txt' as AbsolutePath)).to.equal('/foo/bar/baz.txt')
      expect(getCanonicalPath('/Foo/Bar/Baz.Txt' as AbsolutePath)).to.equal('/Foo/Bar/Baz.Txt')
    } else {
      expect(getCanonicalPath('/FOO/BAR/BAZ.TXT' as AbsolutePath)).to.equal('/foo/bar/baz.txt')
      expect(getCanonicalPath('/foo/bar/baz.txt' as AbsolutePath)).to.equal('/foo/bar/baz.txt')
      expect(getCanonicalPath('/Foo/Bar/Baz.Txt' as AbsolutePath)).to.equal('/foo/bar/baz.txt')
    }
  })
})
