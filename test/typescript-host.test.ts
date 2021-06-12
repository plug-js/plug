import { expect } from 'chai'
import { ScriptTarget } from 'typescript'
import { TypeScriptHost } from '../src/typescript/host'

describe('TypeScript Host', () => {
  it('instantiate and pass basic sanity checks', () => {
    new TypeScriptHost({ builder: () => {} } as any)

    let number = 0
    const fake = {
      // test that builder re-generates every time it's called
      builder: (): any => {
        const builder = number ++
        return { build: (): any => `builder ${builder} build ${number ++}` }
      },
      // test exceptions and onError(...) on getSourceFile
      get: (f: string): never => {
        throw new Error(`get${f}`)
      },
    }

    const host = new TypeScriptHost(fake as any)

    // test that builder re-generates every time it's called
    expect(host.buildFileSystem()).to.equal('builder 0 build 1')
    expect(host.buildFileSystem()).to.equal('builder 2 build 3')
    expect(host.buildFileSystem()).to.equal('builder 4 build 5')

    // test exceptions on getSourceFile
    expect(() => host.getSourceFile('foo', ScriptTarget.ES3)).to.throw(Error, 'getfoo')

    // test onError(...) on getSourceFile
    let message = undefined as string | undefined
    host.getSourceFile('bar', ScriptTarget.ES3, (m) => message = m)
    expect(message).to.equal('getbar')
  })
})
