import { expect } from 'chai'
import {
  FilePath,
  DirectoryPath,
  getRelativePath,
  getCanonicalPath,
  resolvePath,
  getParent,
  isChild,
  caseSensitivePaths,
  RelativeDirectoryPath,
  RelativeFilePath,
} from '../src/utils/paths'

describe('Paths', () => {
  const x_dir = '/Foo/Bar' as DirectoryPath
  const x_file = '/Foo/Bar/Baz.Txt' as FilePath
  const u_file = '/FOO/BAR/BAZ.TXT' as FilePath
  const l_file = '/foo/bar/baz.txt' as FilePath

  it('should get a directory path', () => {
    expect(resolvePath(x_dir)).to.equal('/Foo/Bar')
    expect(resolvePath(x_dir, '.' as RelativeDirectoryPath)).to.equal('/Foo/Bar')
    expect(resolvePath(x_dir, 'Baz' as RelativeDirectoryPath)).to.equal('/Foo/Bar/Baz')
    expect(resolvePath(x_dir, './Baz' as RelativeDirectoryPath)).to.equal('/Foo/Bar/Baz')
    expect(resolvePath(x_dir, '../Baz' as RelativeDirectoryPath)).to.equal('/Foo/Baz')
  })

  it('should get an absolute path', () => {
    expect(resolvePath(x_dir, 'Baz.Txt' as RelativeFilePath)).to.equal(x_file)
    expect(resolvePath(x_dir, './Baz.Txt' as RelativeFilePath)).to.equal(x_file)
    expect(resolvePath(x_dir, '../Baz.Txt' as RelativeFilePath)).to.equal('/Foo/Baz.Txt')
  })

  it('should get a directory for a file', () => {
    expect(getParent(x_file)).to.equal(x_dir)
  })

  it('should honor case sensitivity in tests', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      expect(caseSensitivePaths()).to.be.true

      ;(<any> globalThis).caseSensitivePaths = false
      expect(caseSensitivePaths()).to.be.false
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should canonicalize a file name', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      expect(getCanonicalPath(u_file)).to.equal(u_file)
      expect(getCanonicalPath(l_file)).to.equal(l_file)
      expect(getCanonicalPath(x_file)).to.equal(x_file)

      ;(<any> globalThis).caseSensitivePaths = false
      expect(getCanonicalPath(u_file)).to.equal(l_file)
      expect(getCanonicalPath(l_file)).to.equal(l_file)
      expect(getCanonicalPath(x_file)).to.equal(l_file)
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should get a relative path for a file', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      expect(getRelativePath(x_dir, x_file)).to.equal('Baz.Txt')
      expect(getRelativePath(x_dir, l_file)).to.equal('../../foo/bar/baz.txt')
      expect(getRelativePath(x_dir, u_file)).to.equal('../../FOO/BAR/BAZ.TXT')

      ;(<any> globalThis).caseSensitivePaths = false
      expect(getRelativePath(x_dir, x_file)).to.equal('baz.txt')
      expect(getRelativePath(x_dir, x_file)).to.equal('baz.txt')
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should determine if an absolute path is child of a directory', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      expect(isChild(x_dir, x_file)).to.be.true
      expect(isChild(x_dir, l_file)).to.be.false
      expect(isChild(x_dir, u_file)).to.be.false
      expect(isChild(x_dir, x_dir)).to.be.false

      ;(<any> globalThis).caseSensitivePaths = false
      expect(isChild(x_dir, x_file)).to.be.true
      expect(isChild(x_dir, l_file)).to.be.true
      expect(isChild(x_dir, u_file)).to.be.true
      expect(isChild(x_dir, x_dir)).to.be.false
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })
})
