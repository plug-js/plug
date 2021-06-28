import { expect } from 'chai'
import { File } from '../src/files/file'
import { FileWrapper } from '../src/files/wrapper'
import { FilePath } from '../src/utils/paths'

describe('File Basics', () => {
  it('should create a simple file', async () => {
    try {
      (<any> globalThis).caseSensitivePaths = false

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
          if (this.#sourcemap) return { produceSourceMap: (...args: any[]): any => args }
        }
      }

      const file1 = new FileImpl(true, '/Foo/Bar.txt')

      expect(file1.absolutePath).to.equal('/Foo/Bar.txt')
      expect(file1.canonicalPath).to.equal('/foo/bar.txt')
      expect(file1.originalFile).to.be.undefined

      expect(await file1.rawSourceMap({ baz: 123 } as any))
          .to.eql([ '/Foo/Bar.txt', { baz: 123 } ])

      const file2 = new FileImpl(false, '/Foo/Baz.txt', file1)

      expect(file2.absolutePath).to.equal('/Foo/Baz.txt')
      expect(file2.canonicalPath).to.equal('/foo/baz.txt')
      expect(file2.originalFile).to.equal(file1)

      expect(await file2.rawSourceMap({ baz: 123 } as any)).to.be.undefined
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
