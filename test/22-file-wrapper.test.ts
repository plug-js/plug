// @ts-nocheck
import { FileSourceMap } from '../src/sourcemaps'
import { FileWrapper } from '../src/files/wrapper'
import { expect } from 'chai'
import { File } from '../src/files'

describe.skip('File Wrapper', () => {
  it('should wrap an existing file', async () => {
    const map = FileSourceMap.for('/foo/wrong path' as any, { version: 3 } as any)
    const file: File = {
      absolutePath: '/foo/absolute path' as any,
      originalPath: '/foo/original path' as any,
      canonicalPath: '/foo/canonical path' as any,
      contents: (): Promise<string> => 'contents' as any,
      contentsSync: (): string => 'contentsSync' as any,
      sourceMap: (): Promise<FileSourceMap | undefined> => Promise.resolve(map),
      sourceMapSync: (): FileSourceMap | undefined => map,
    }

    const wrapper = new FileWrapper(file)
    expect(wrapper.absolutePath).to.equal('/foo/absolute path')
    expect(wrapper.originalPath).to.equal('/foo/original path')
    expect(wrapper.canonicalPath).to.equal('/foo/absolute path') // recomputed!

    expect(wrapper.contents()).to.equal('contents')
    expect(wrapper.contentsSync()).to.equal('contentsSync')

    const asyncWrapper = new FileWrapper(file)
    const asyncMap = await asyncWrapper.sourceMap()
    expect(asyncMap).to.equal(map) // same path
    expect(await asyncWrapper.sourceMap()).to.equal(map) // cached
    expect(asyncWrapper.sourceMapSync()).to.equal(map) // cached

    const syncWrapper = new FileWrapper(file)
    const syncMap = syncWrapper.sourceMapSync()
    expect(syncMap).to.equal(map) // same path
    expect(await syncWrapper.sourceMap()).to.equal(syncMap) // cached
    expect(syncWrapper.sourceMapSync()).to.equal(syncMap) // cached
  })

  it('should wrap an existing file with a different absolute path', async () => {
    const map = FileSourceMap.for('/foo/wrong path' as any, { version: 3 } as any)
    const file: File = {
      absolutePath: '/foo/absolute path' as any,
      originalPath: '/foo/original path' as any,
      canonicalPath: '/foo/canonical path' as any,
      contents: (): Promise<string> => 'contents' as any,
      contentsSync: (): string => 'contentsSync' as any,
      sourceMap: (): Promise<FileSourceMap | undefined> => Promise.resolve(map),
      sourceMapSync: (): FileSourceMap | undefined => map,
    }

    const wrapper = new FileWrapper(file, '/foo/another absolute path' as any)
    expect(wrapper.absolutePath).to.equal('/foo/another absolute path')
    expect(wrapper.originalPath).to.equal('/foo/original path')
    expect(wrapper.canonicalPath).to.equal('/foo/another absolute path') // recomputed

    expect(wrapper.contents()).to.equal('contents')
    expect(wrapper.contentsSync()).to.equal('contentsSync')

    const asyncWrapper = new FileWrapper(file, '/foo/async first' as any)
    const asyncMap = await asyncWrapper.sourceMap()
    expect(asyncMap?.file).to.equal('/foo/async first')
    expect(await asyncWrapper.sourceMap()).to.equal(asyncMap) // cached
    expect(asyncWrapper.sourceMapSync()).to.equal(asyncMap) // cached

    const syncWrapper = new FileWrapper(file, '/foo/async later' as any)
    const syncMap = syncWrapper.sourceMapSync()
    expect(syncMap?.file).to.equal('/foo/async later')
    expect(await syncWrapper.sourceMap()).to.equal(syncMap) // cached
    expect(syncWrapper.sourceMapSync()).to.equal(syncMap) // cached
  })
})
