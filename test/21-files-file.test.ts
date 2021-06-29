import { expect } from 'chai'
import { File } from '../src/files/file'
import { FileWrapper } from '../src/files/wrapper'
import { FilePath } from '../src/utils/paths'

describe('File Basics', () => {
  it('should create a simple file', async () => {
    class FileImpl extends File {
      #sourcemap: boolean

      constructor(sourcemap: boolean, path: string, original?: File) {
        super(path as FilePath, original)
        this.#sourcemap = sourcemap
      }

      contents(): Promise<string> {
        throw new Error()
      }

      contentsSync(): string {
        throw new Error()
      }

      sourceMap(): any {
        throw new Error()
      }
    }

    try {
      (<any> globalThis).caseSensitivePaths = false

      const file1 = new FileImpl(true, '/Foo/Bar.txt')

      expect(file1.absolutePath).to.equal('/Foo/Bar.txt')
      expect(file1.canonicalPath).to.equal('/foo/bar.txt')
      expect(file1.originalFile).to.be.undefined

      const file2 = new FileImpl(false, '/Foo/Baz.txt', file1)

      expect(file2.absolutePath).to.equal('/Foo/Baz.txt')
      expect(file2.canonicalPath).to.equal('/foo/baz.txt')
      expect(file2.originalFile).to.equal(file1)

      ;(<any> globalThis).caseSensitivePaths = true

      const file3 = new FileImpl(true, '/Foo/Bar.txt')

      expect(file3.absolutePath).to.equal('/Foo/Bar.txt')
      expect(file3.canonicalPath).to.equal('/Foo/Bar.txt')
      expect(file3.originalFile).to.be.undefined

      const file4 = new FileImpl(false, '/Foo/Baz.txt', file3)

      expect(file4.absolutePath).to.equal('/Foo/Baz.txt')
      expect(file4.canonicalPath).to.equal('/Foo/Baz.txt')
      expect(file4.originalFile).to.equal(file3)
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should create a wrapper file', async () => {
    const file = new class extends File {
      constructor() {
        super('/foo/bar.txt' as FilePath)
      }

      contents(): any {
        return 'contents async'
      }

      contentsSync(): string {
        return 'contents sync'
      }

      sourceMap(): any {
        return 'source map'
      }
    }

    const wrapper = new FileWrapper(file, '/foo/baz.txt' as FilePath)
    expect(wrapper.absolutePath).to.equal('/foo/baz.txt')
    expect(wrapper.canonicalPath).to.equal('/foo/baz.txt')
    expect(wrapper.originalFile).to.be.equal(file)

    // no async methods
    expect(wrapper.contents()).to.be.equal('contents async')
    expect(wrapper.contentsSync()).to.be.equal('contents sync')
    expect(wrapper.sourceMap()).to.be.equal('source map')
  })
})
