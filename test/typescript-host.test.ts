import { expect } from 'chai'
import { EOL } from 'os'
import { basename, isAbsolute } from 'path'
import { ScriptTarget } from 'typescript'
import { TypeScriptHost } from '../src/typescript/host'
import { caseSensitivePaths } from '../src/utils/paths'

describe('TypeScript Host', () => {
  it('should regenerate the virtual file system on build', () => {
    let number = 0
    const fake = {
      builder: (): any => {
        const builder = number ++
        return {
          // test that builder re-generates every time it's called
          build: (): any => `builder ${builder} build ${number ++}`,
        }
      },
    }

    const host = new TypeScriptHost(fake as any)

    // test that builder re-generates every time it's called
    expect(host.buildFileSystem()).to.equal('builder 0 build 1')
    expect(host.buildFileSystem()).to.equal('builder 2 build 3')
    expect(host.buildFileSystem()).to.equal('builder 4 build 5')
  })

  it('correctly handle the "onError(...)" callbacks', () => {
    const fake = {
      builder: (): any => {
        return {
          // test exceptions and onError(...) on writeFile
          add: (filename: string, data: string): never => {
            throw new Error(`filename ${filename} data ${data}`)
          },
        }
      },
      // test exceptions and onError(...) on getSourceFile
      get: (f: string): never => {
        throw new Error(`get ${f}`)
      },
    }

    const host = new TypeScriptHost(fake as any)

    // test exceptions on getSourceFile
    expect(() => host.getSourceFile('foo', ScriptTarget.ES3))
        .to.throw(Error, 'get foo')

    // test onError(...) on getSourceFile
    let message1 = undefined as string | undefined
    host.getSourceFile('bar', ScriptTarget.ES3, (m) => message1 = m)
    expect(message1).to.equal('get bar')

    // test exceptions on writeFile
    expect(() => host.writeFile('foo', 'bar', false))
        .to.throw(Error, 'filename foo data bar')

    // test onError(...) on writeFile
    let message2 = undefined as string | undefined
    host.writeFile('baz', 'xyz', false, (m) => message2 = m)
    expect(message2).to.equal('filename baz data xyz')
  })

  it('should correctly return the basics required by typescript', () => {
    const host = new TypeScriptHost({
      builder: () => {},
      directoryPath: 'the current directory',
      get: (filename: string):any => ({
        canonicalPath: `canonical ${filename}`,
        existsSync: (): string => filename != 'no' ? `existsSync ${filename}` : '',
        contentsSync: (): string => `contentsSync ${filename}`
      }),
    } as any)

    const libFileName = host.getDefaultLibFileName({})
    expect(isAbsolute(libFileName)).to.be.true
    expect(basename(libFileName)).to.equal('lib.d.ts')

    expect(host.useCaseSensitiveFileNames()).to.equal(caseSensitivePaths)

    expect(host.createHash('')).to.equal('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(host.getNewLine()).to.equal(EOL)

    expect(host.fileExists('foobar')).to.equal('existsSync foobar')

    expect(host.getCurrentDirectory()).to.equal('the current directory')

    expect(host.getCanonicalFileName('baz.txt')).to.equal('canonical baz.txt')

    expect(host.readFile('baz.txt')).to.equal('contentsSync baz.txt')
    expect(host.readFile('no')).to.be.undefined
  })
})
