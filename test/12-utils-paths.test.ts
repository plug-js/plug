import { AssertionError } from 'assert'
import { expect } from 'chai'
import {
  DirectoryPath,
  FilePath,
  caseSensitivePaths,
  createDirectoryPath,
  createFilePath,
  getCanonicalPath,
  getParent,
  getRelativeFilePath,
  getRelativePath,
  isChild,
  isChildOrSame,
  getCurrentDirectory,
} from '../src/utils/paths'

describe('Paths', () => {
  const x_dir = '/Foo/Bar' as DirectoryPath
  const x_file = '/Foo/Bar/Baz.Txt' as FilePath
  const u_file = '/FOO/BAR/BAZ.TXT' as FilePath
  const l_file = '/foo/bar/baz.txt' as FilePath

  it('should create paths', () => {
    const dir = '/foo' as DirectoryPath
    expect(createFilePath(dir, 'bar', 'baz')).to.equal('/foo/bar/baz')
    expect(createFilePath(dir, 'bar', '/baz')).to.equal('/baz')
    expect(createDirectoryPath(dir, 'bar', 'baz')).to.equal('/foo/bar/baz')
    expect(createDirectoryPath(dir, 'bar', '/baz')).to.equal('/baz')

    expect(() => createFilePath('foo' as DirectoryPath, 'bar', 'baz'))
        .to.throw(AssertionError, 'Not an absolute path: foo')
    expect(() => createDirectoryPath('foo' as DirectoryPath, 'bar', 'baz'))
        .to.throw(AssertionError, 'Not an absolute path: foo')
  })

  it('should get the current directory', () => {
    expect(getCurrentDirectory()).to.equal(process.cwd())
  })

  it('should get a directory for a file', () => {
    expect(getParent(x_file)).to.equal(x_dir)
    expect(getParent(x_dir)).to.equal('/Foo')
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

  it('should get a relative path from a directory', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      expect(getRelativePath(x_dir, x_file)).to.equal('Baz.Txt')
      expect(getRelativePath(x_dir, l_file)).to.equal('../../foo/bar/baz.txt')
      expect(getRelativePath(x_dir, u_file)).to.equal('../../FOO/BAR/BAZ.TXT')
      expect(getRelativePath(x_dir, '/Foo/Xyz.Txt' as FilePath)).to.equal('../Xyz.Txt')

      ;(<any> globalThis).caseSensitivePaths = false
      expect(getRelativePath(x_dir, x_file)).to.equal('Baz.Txt')
      expect(getRelativePath(x_dir, l_file)).to.equal('baz.txt')
      expect(getRelativePath(x_dir, u_file)).to.equal('BAZ.TXT')
      expect(getRelativePath(x_dir, '/Foo/Xyz.Txt' as FilePath)).to.equal('../Xyz.Txt')
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should get a relative path from a file', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      expect(getRelativeFilePath(x_file, x_file)).to.equal('Baz.Txt')
      expect(getRelativeFilePath(x_file, l_file)).to.equal('../../foo/bar/baz.txt')
      expect(getRelativeFilePath(x_file, u_file)).to.equal('../../FOO/BAR/BAZ.TXT')
      expect(getRelativeFilePath(x_file, '/Foo/Xyz' as DirectoryPath)).to.equal('../Xyz')

      ;(<any> globalThis).caseSensitivePaths = false
      expect(getRelativeFilePath(x_file, x_file)).to.equal('Baz.Txt')
      expect(getRelativeFilePath(x_file, l_file)).to.equal('baz.txt')
      expect(getRelativeFilePath(x_file, u_file)).to.equal('BAZ.TXT')
      expect(getRelativeFilePath(x_file, '/Foo/Xyz' as DirectoryPath)).to.equal('../Xyz')
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should determine if a path is child of a directory', () => {
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

  it('should determine if a directory is child or same of a directory', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      expect(isChildOrSame(x_dir, x_file as any)).to.be.true
      expect(isChildOrSame(x_dir, l_file as any)).to.be.false
      expect(isChildOrSame(x_dir, u_file as any)).to.be.false
      expect(isChildOrSame(x_dir, x_dir)).to.be.true

      ;(<any> globalThis).caseSensitivePaths = false
      expect(isChildOrSame(x_dir, x_file as any)).to.be.true
      expect(isChildOrSame(x_dir, l_file as any)).to.be.true
      expect(isChildOrSame(x_dir, u_file as any)).to.be.true
      expect(isChildOrSame(x_dir, x_dir)).to.be.true
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })
})
