import { expect } from 'chai'
import {
  AbsolutePath,
  DirectoryPath,
  getRelativePath,
  getCanonicalPath,
  getAbsolutePath,
  getDirectoryPath,
  getDirectory,
  isChild,
  caseSensitivePaths,
} from '../src/utils/paths'

describe.only('Paths', () => {
  const x_dir = '/Foo/Bar' as DirectoryPath
  const x_file = '/Foo/Bar/Baz.Txt' as AbsolutePath
  const u_file = '/FOO/BAR/BAZ.TXT' as AbsolutePath
  const l_file = '/foo/bar/baz.txt' as AbsolutePath

  it('should get a directory path', () => {
    expect(getDirectoryPath(x_dir)).to.equal('/Foo/Bar')
    expect(getDirectoryPath(x_dir, '.')).to.equal('/Foo/Bar')
    expect(getDirectoryPath(x_dir, 'Baz')).to.equal('/Foo/Bar/Baz')
    expect(getDirectoryPath(x_dir, './Baz')).to.equal('/Foo/Bar/Baz')
    expect(getDirectoryPath(x_dir, '../Baz')).to.equal('/Foo/Baz')
  })

  it('should get an absolute path', () => {
    expect(getAbsolutePath(x_dir, 'Baz.Txt')).to.equal(x_file)
    expect(getAbsolutePath(x_dir, './Baz.Txt')).to.equal(x_file)
    expect(getAbsolutePath(x_dir, '../Baz.Txt')).to.equal('/Foo/Baz.Txt')
  })

  it('should get a directory for a file', () => {
    expect(getDirectory(x_file)).to.equal(x_dir)
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
      expect(isChild(x_dir, x_dir as AbsolutePath)).to.be.false

      ;(<any> globalThis).caseSensitivePaths = false
      expect(isChild(x_dir, x_file)).to.be.true
      expect(isChild(x_dir, l_file)).to.be.true
      expect(isChild(x_dir, u_file)).to.be.true
      expect(isChild(x_dir, x_dir as AbsolutePath)).to.be.false
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })
})
