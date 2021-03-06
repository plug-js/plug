import { EOL } from 'os'
import { TypeScriptHost } from '../src/typescript/host'
import { expect } from 'chai'
import { mock } from './support'

import { ScriptKind, ScriptTarget } from 'typescript'
import { basename, isAbsolute } from 'path'
import { caseSensitivePaths, getCanonicalPath } from '../src/utils/paths'

describe('TypeScript Host', () => {
  it('should correctly return the basics required by typescript', () => {
    const host = new TypeScriptHost({
      directory: '/foo',
      get: (filename: string): any => ( filename === 'missing' ? undefined : {
        contentsSync: (): string => `contentsSync ${filename}`,
      }),
    } as any)

    const libFileName = host.getDefaultLibFileName({})
    expect(isAbsolute(libFileName)).to.be.true
    expect(basename(libFileName)).to.equal('lib.d.ts')

    expect(host.useCaseSensitiveFileNames()).to.equal(caseSensitivePaths())

    expect(host.createHash('')).to.equal('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(host.getNewLine()).to.equal(EOL)

    expect(host.fileExists('foobar')).to.be.true
    expect(host.fileExists('missing')).to.be.false

    expect(host.getCurrentDirectory()).to.equal('/foo')

    expect(host.getCanonicalFileName('Baz.Txt')).to.equal(getCanonicalPath('/foo/Baz.Txt' as any))
    expect(host.getCanonicalFileName('missing')).to.equal(getCanonicalPath('/foo/missing' as any))

    expect(host.readFile('baz.txt')).to.equal('contentsSync baz.txt')
    expect(host.readFile('missing')).to.be.undefined
  })

  it('should create some source files', () => {
    const { files } = mock('/foo')
    files.add('bar.ts', { contents: '// ts' })
    files.add('bar.tsx', { contents: '// tsx' })
    files.add('bar.js', { contents: '// js' })
    files.add('bar.jsx', { contents: '// jsx' })
    files.add('bar.json', { contents: '// json' })
    files.add('bar.txt', { contents: '// txt' })

    const host = new TypeScriptHost(files)

    const bin = host.getSourceFile('bar.bin', ScriptTarget.ES2021)
    expect(bin).to.be.undefined

    const ts = host.getSourceFile('bar.ts', ScriptTarget.ES2015)
    const tsx = host.getSourceFile('bar.tsx', ScriptTarget.ES2016)
    const js = host.getSourceFile('bar.js', ScriptTarget.ES2017)
    const jsx = host.getSourceFile('bar.jsx', ScriptTarget.ES2018)
    const json = host.getSourceFile('bar.json', ScriptTarget.ES2019)
    const txt = host.getSourceFile('bar.txt', ScriptTarget.ES2020)

    expect(ts?.languageVersion).to.equal(ScriptTarget.ES2015)
    expect(tsx?.languageVersion).to.equal(ScriptTarget.ES2016)
    expect(js?.languageVersion).to.equal(ScriptTarget.ES2017)
    expect(jsx?.languageVersion).to.equal(ScriptTarget.ES2018)
    // expect(json?.languageVersion).to.equal(ScriptTarget.ES2019) // always 2015?
    expect(txt?.languageVersion).to.equal(ScriptTarget.ES2020)

    expect((<any> ts)?.scriptKind).to.equal(ScriptKind.TS)
    expect((<any> tsx)?.scriptKind).to.equal(ScriptKind.TSX)
    expect((<any> js)?.scriptKind).to.equal(ScriptKind.JS)
    expect((<any> jsx)?.scriptKind).to.equal(ScriptKind.JSX)
    expect((<any> json)?.scriptKind).to.equal(ScriptKind.JSON)
    // expect((<any> txt)?.scriptKind).to.equal(ScriptKind.Unknown) // always TS

    expect(ts?.fileName).to.equal('/foo/bar.ts')
    expect(tsx?.fileName).to.equal('/foo/bar.tsx')
    expect(js?.fileName).to.equal('/foo/bar.js')
    expect(jsx?.fileName).to.equal('/foo/bar.jsx')
    expect(json?.fileName).to.equal('/foo/bar.json')
    expect(txt?.fileName).to.equal('/foo/bar.txt')

    expect(ts?.text).to.equal('// ts')
    expect(tsx?.text).to.equal('// tsx')
    expect(js?.text).to.equal('// js')
    expect(jsx?.text).to.equal('// jsx')
    expect(json?.text).to.equal('// json')
    expect(txt?.text).to.equal('// txt')

    // cache!
    expect(host.getSourceFile('bar.ts', ScriptTarget.ES2015)).to.equal(ts)
    expect(host.getSourceFile('bar.tsx', ScriptTarget.ES2016)).to.equal(tsx)
    expect(host.getSourceFile('bar.js', ScriptTarget.ES2017)).to.equal(js)
    expect(host.getSourceFile('bar.jsx', ScriptTarget.ES2018)).to.equal(jsx)
    expect(host.getSourceFile('bar.json', ScriptTarget.ES2019)).to.equal(json)
    expect(host.getSourceFile('bar.txt', ScriptTarget.ES2020)).to.equal(txt)

    // cache with "shouldCreateNewSourceFile = false"
    expect(host.getSourceFile('bar.ts', ScriptTarget.ES2015, undefined, false)).to.equal(ts)
    expect(host.getSourceFile('bar.tsx', ScriptTarget.ES2016, undefined, false)).to.equal(tsx)
    expect(host.getSourceFile('bar.js', ScriptTarget.ES2017, undefined, false)).to.equal(js)
    expect(host.getSourceFile('bar.jsx', ScriptTarget.ES2018, undefined, false)).to.equal(jsx)
    expect(host.getSourceFile('bar.json', ScriptTarget.ES2019, undefined, false)).to.equal(json)
    expect(host.getSourceFile('bar.txt', ScriptTarget.ES2020, undefined, false)).to.equal(txt)

    // cache with "shouldCreateNewSourceFile = true"
    expect(host.getSourceFile('bar.ts', ScriptTarget.ES2015, undefined, true)).not.to.equal(ts)
    expect(host.getSourceFile('bar.tsx', ScriptTarget.ES2016, undefined, true)).not.to.equal(tsx)
    expect(host.getSourceFile('bar.js', ScriptTarget.ES2017, undefined, true)).not.to.equal(js)
    expect(host.getSourceFile('bar.jsx', ScriptTarget.ES2018, undefined, true)).not.to.equal(jsx)
    expect(host.getSourceFile('bar.json', ScriptTarget.ES2019, undefined, true)).not.to.equal(json)
    expect(host.getSourceFile('bar.txt', ScriptTarget.ES2020, undefined, true)).not.to.equal(txt)

    // cache with "shouldCreateNewSourceFile = false" but new copy from above is cached
    expect(host.getSourceFile('bar.ts', ScriptTarget.ES2015, undefined, false)).not.to.equal(ts)
    expect(host.getSourceFile('bar.tsx', ScriptTarget.ES2016, undefined, false)).not.to.equal(tsx)
    expect(host.getSourceFile('bar.js', ScriptTarget.ES2017, undefined, false)).not.to.equal(js)
    expect(host.getSourceFile('bar.jsx', ScriptTarget.ES2018, undefined, false)).not.to.equal(jsx)
    expect(host.getSourceFile('bar.json', ScriptTarget.ES2019, undefined, false)).not.to.equal(json)
    expect(host.getSourceFile('bar.txt', ScriptTarget.ES2020, undefined, false)).not.to.equal(txt)

    // cache with different "languageVersion"
    expect(host.getSourceFile('bar.ts', ScriptTarget.ES2020)).to.not.equal(ts)
    expect(host.getSourceFile('bar.tsx', ScriptTarget.ES2019)).to.not.equal(tsx)
    expect(host.getSourceFile('bar.js', ScriptTarget.ES2018)).to.not.equal(js)
    expect(host.getSourceFile('bar.jsx', ScriptTarget.ES2017)).to.not.equal(jsx)
    expect(host.getSourceFile('bar.json', ScriptTarget.ES2016)).to.not.equal(json)
    expect(host.getSourceFile('bar.txt', ScriptTarget.ES2015)).to.not.equal(txt)
  })

  it('should create different source files for files with different names', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true

      const { files } = mock('/foo')
      files.add('bar1.ts', { contents: 'void 0' })
      files.add('bar2.ts', { contents: 'void 0' })
      files.add('BAR1.TS', { contents: 'void 0' })
      files.add('BAR2.TS', { contents: 'void 0' })

      const host = new TypeScriptHost(files)

      const file1l = host.getSourceFile('bar1.ts', ScriptTarget.ES2020)
      const file1u = host.getSourceFile('BAR1.TS', ScriptTarget.ES2020)
      const file2l = host.getSourceFile('bar2.ts', ScriptTarget.ES2020)
      const file2u = host.getSourceFile('BAR2.TS', ScriptTarget.ES2020)

      expect(file1l?.fileName).to.equal('/foo/bar1.ts')
      expect(file1u?.fileName).to.equal('/foo/BAR1.TS')
      expect(file2l?.fileName).to.equal('/foo/bar2.ts')
      expect(file2u?.fileName).to.equal('/foo/BAR2.TS')
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }

    try {
      (<any> globalThis).caseSensitivePaths = false

      const { files } = mock('/foo')
      files.add('bar1.ts', { contents: 'void 0' })
      files.add('bar2.ts', { contents: 'void 0' })
      files.add('BAR1.ts', { contents: 'void 0' })
      files.add('BAR2.ts', { contents: 'void 0' })

      const host = new TypeScriptHost(files)

      const file1l = host.getSourceFile('bar1.ts', ScriptTarget.ES2020)
      const file1u = host.getSourceFile('BAR1.TS', ScriptTarget.ES2020)
      const file2l = host.getSourceFile('bar2.ts', ScriptTarget.ES2020)
      const file2u = host.getSourceFile('BAR2.TS', ScriptTarget.ES2020)

      expect(file1l?.fileName).to.equal('/foo/bar1.ts')
      expect(file1u?.fileName).to.equal('/foo/bar1.ts')
      expect(file2l?.fileName).to.equal('/foo/bar2.ts')
      expect(file2u?.fileName).to.equal('/foo/bar2.ts')

      expect(file1l).to.equal(file1u)
      expect(file2l).to.equal(file2u)
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('correctly handle the "onError(...)" callbacks', () => {
    const fake = {
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
        .to.throw(Error, 'Cowardly refusing to write foo')

    // test onError(...) on writeFile
    let message2 = undefined as string | undefined
    host.writeFile('baz', 'xyz', false, (m) => message2 = m)
    expect(message2).to.equal('Politely refusing to write files')
  })
})
