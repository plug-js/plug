import { FileSourceMap } from '../src/source-maps'
import { FileWrapper } from '../src/files/wrapper'
import { Project } from '../src/project'
import { expect } from 'chai'
import { File, Files } from '../src/files'

describe('File Wrapper', () => {
  function makeFiles(directory: string): Files {
    return new Files({ directory } as Project)
  }

  it('should wrap an existing file', () => {
    const files = makeFiles('/foo')
    const file: File = {
      files: undefined as any,
      absolutePath: '/foo/absolute path' as any,
      relativePath: 'relative path' as any,
      originalPath: '/foo/original path' as any,
      canonicalPath: '/foo/canonical path' as any,
      contents: (): Promise<string> => 'contents' as any,
      contentsSync: (): string => 'contentsSync' as any,
      sourceMap: (): Promise<FileSourceMap | undefined> => 'sourceMap' as any,
      sourceMapSync: (): FileSourceMap | undefined => 'sourceMapSync' as any,
    }

    const wrapper = new FileWrapper(files, file)
    expect(wrapper.files).to.equal(files)
    expect(wrapper.absolutePath).to.equal('/foo/absolute path')
    expect(wrapper.relativePath).to.equal('absolute path') // recomputed
    expect(wrapper.originalPath).to.equal('/foo/original path')
    expect(wrapper.canonicalPath).to.equal('/foo/absolute path') // recomputed!

    expect(wrapper.contents()).to.equal('contents')
    expect(wrapper.contentsSync()).to.equal('contentsSync')
    expect(wrapper.sourceMap()).to.equal('sourceMap')
    expect(wrapper.sourceMapSync()).to.equal('sourceMapSync')
  })

  it('should wrap an existing file with a different absolute path', () => {
    const files = makeFiles('/foo')
    const file: File = {
      files: undefined as any,
      absolutePath: '/foo/absolute path' as any,
      relativePath: 'relative path' as any,
      originalPath: '/foo/original path' as any,
      canonicalPath: '/foo/canonical path' as any,
      contents: (): Promise<string> => 'contents' as any,
      contentsSync: (): string => 'contentsSync' as any,
      sourceMap: (): Promise<FileSourceMap | undefined> => 'sourceMap' as any,
      sourceMapSync: (): FileSourceMap | undefined => 'sourceMapSync' as any,
    }

    const wrapper = new FileWrapper(files, file, '/foo/another absolute path' as any)
    expect(wrapper.files).to.equal(files)
    expect(wrapper.absolutePath).to.equal('/foo/another absolute path')
    expect(wrapper.relativePath).to.equal('another absolute path') // recomputed
    expect(wrapper.originalPath).to.equal('/foo/original path')
    expect(wrapper.canonicalPath).to.equal('/foo/another absolute path') // recomputed

    expect(wrapper.contents()).to.equal('contents')
    expect(wrapper.contentsSync()).to.equal('contentsSync')
    expect(wrapper.sourceMap()).to.equal('sourceMap')
    expect(wrapper.sourceMapSync()).to.equal('sourceMapSync')
  })
})
