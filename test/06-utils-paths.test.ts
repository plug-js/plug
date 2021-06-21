import { expect } from 'chai'
import {
  DirectoryPath,
  FilePath,
  RelativeDirectoryPath,
  RelativeFilePath,
  caseSensitivePaths,
  createDirectoryPath,
  createFilePath,
  getCanonicalPath,
  getParent,
  getRelativeFilePath,
  getRelativePath,
  isChild,
  resolveFilePath,
  resolvePath,
} from '../src/utils/paths'

describe('Paths', () => {
  const x_dir = '/Foo/Bar' as DirectoryPath
  const x_file = '/Foo/Bar/Baz.Txt' as FilePath
  const u_file = '/FOO/BAR/BAZ.TXT' as FilePath
  const l_file = '/foo/bar/baz.txt' as FilePath

  it('should create paths', () => {
    expect(createFilePath('foo', 'bar', 'baz')).to.equal('/foo/bar/baz')
    expect(createFilePath('foo', 'bar', '/baz')).to.equal('/baz')
    expect(createDirectoryPath('foo', 'bar', 'baz')).to.equal('/foo/bar/baz')
    expect(createDirectoryPath('foo', 'bar', '/baz')).to.equal('/baz')
  })

  it('should resolve a path', () => {
    expect(resolvePath(x_dir)).to.equal('/Foo/Bar')
    expect(resolvePath(x_dir, '.' as RelativeDirectoryPath)).to.equal('/Foo/Bar')
    expect(resolvePath(x_dir, 'Baz' as RelativeDirectoryPath)).to.equal('/Foo/Bar/Baz')
    expect(resolvePath(x_dir, './Baz' as RelativeDirectoryPath)).to.equal('/Foo/Bar/Baz')
    expect(resolvePath(x_dir, '../Baz' as RelativeDirectoryPath)).to.equal('/Foo/Baz')
    expect(resolvePath(x_dir, '/Foo/Bar/Baz' as DirectoryPath)).to.equal('/Foo/Bar/Baz')

    expect(resolvePath(x_dir, 'Baz.Txt' as RelativeFilePath)).to.equal('/Foo/Bar/Baz.Txt')
    expect(resolvePath(x_dir, './Baz.Txt' as RelativeFilePath)).to.equal('/Foo/Bar/Baz.Txt')
    expect(resolvePath(x_dir, '../Baz.Txt' as RelativeFilePath)).to.equal('/Foo/Baz.Txt')
    expect(resolvePath(x_dir, x_file)).to.equal(x_file)
  })

  it('should resolve a path', () => {
    expect(resolveFilePath(x_file)).to.equal('/Foo/Bar')
    expect(resolveFilePath(x_file, '.' as RelativeDirectoryPath)).to.equal('/Foo/Bar')
    expect(resolveFilePath(x_file, 'Baz' as RelativeDirectoryPath)).to.equal('/Foo/Bar/Baz')
    expect(resolveFilePath(x_file, './Baz' as RelativeDirectoryPath)).to.equal('/Foo/Bar/Baz')
    expect(resolveFilePath(x_file, '../Baz' as RelativeDirectoryPath)).to.equal('/Foo/Baz')
    expect(resolveFilePath(x_file, '/Foo/Bar/Baz' as DirectoryPath)).to.equal('/Foo/Bar/Baz')

    expect(resolveFilePath(x_file, 'Baz.Txt' as RelativeFilePath)).to.equal('/Foo/Bar/Baz.Txt')
    expect(resolveFilePath(x_file, './Baz.Txt' as RelativeFilePath)).to.equal('/Foo/Bar/Baz.Txt')
    expect(resolveFilePath(x_file, '../Baz.Txt' as RelativeFilePath)).to.equal('/Foo/Baz.Txt')
    expect(resolveFilePath(x_file, x_file)).to.equal(x_file)
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
