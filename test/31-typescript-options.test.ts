import { expect } from 'chai'
import { DiagnosticCategory, getDefaultCompilerOptions, ModuleKind } from 'typescript'
import { getCompilerOptions } from '../src/typescript/options'
import { Files } from '../src/files'
import { DirectoryPath } from '../src/utils/paths'

describe('TypeScript Compiler Options', () => {
  it('should return the default options or fail', () => {
    const files = new Files('/foo' as DirectoryPath)

    let { options, diagnostics } = getCompilerOptions(files)
    expect(options).to.eql(getDefaultCompilerOptions())
    expect(diagnostics.length).to.eql(0)


    ;({ options, diagnostics } = getCompilerOptions(files, 'tsconfig.json'))
    expect(options).to.eql({})
    expect(diagnostics.length).to.equal(1)
    expect(diagnostics[0].code).to.equal(5083)
    expect(diagnostics[0].messageText).to.match(/tsconfig\.json/)
    expect(diagnostics[0].category).to.equal(DiagnosticCategory.Error)

    ;({ options, diagnostics } = getCompilerOptions(files, 'foobar.json'))
    expect(options).to.eql({})
    expect(diagnostics.length).to.equal(1)
    expect(diagnostics[0].code).to.equal(5083)
    expect(diagnostics[0].messageText).to.match(/foobar\.json/)
    expect(diagnostics[0].category).to.equal(DiagnosticCategory.Error)
  })

  it('should read a basic configuration file', () => {
    const files = new Files('/foo' as DirectoryPath)
    files.add('tsconfig.json', { contents: '{"compilerOptions":{"module":"commonjs"}}' })
    files.add('wrong.json', { contents: '{"compilerOptions":{"module":"wrong"}}' })

    let { options, diagnostics } = getCompilerOptions(files)
    expect(options).to.eql(Object.assign({}, getDefaultCompilerOptions(), {
      configFilePath: '/foo/tsconfig.json',
      module: ModuleKind.CommonJS,
    }))
    expect(diagnostics.length).to.eql(0)

    ;({ options, diagnostics } = getCompilerOptions(files, 'wrong.json'))
    expect(options).to.eql({})
    expect(diagnostics.length).to.equal(1)
    expect(diagnostics[0].code).to.equal(6046)
    expect(diagnostics[0].messageText).to.match(/module/)
    expect(diagnostics[0].category).to.equal(DiagnosticCategory.Error)
  })

  it('should read an extended configuration file', () => {
    const base = {
      compilerOptions: {
        // will be overridden
        module: 'amd',
        // those will be resolved
        outDir: './outDir',
        rootDir: './rootDir',
        rootDirs: [ './rootDirs/1', './rootDirs/2' ],
        outFile: './outDile.js',
      },
    }

    const ext = {
      extends: '../base/tsconfig.json',
      compilerOptions: {
        module: 'commonjs', // overrides
      },
    }
    const files = new Files('/foo' as DirectoryPath)
    files.add('base/tsconfig.json', { contents: JSON.stringify(base) })
    files.add('ext/tsconfig.json', { contents: JSON.stringify(ext) })

    let { options, diagnostics } = getCompilerOptions(files, 'ext/tsconfig.json')
    expect(diagnostics.length).to.eql(0)
    expect(options).to.eql(Object.assign(getDefaultCompilerOptions(), {
      module: ModuleKind.CommonJS,
      configFilePath: '/foo/ext/tsconfig.json',
      outDir: '/foo/base/outDir',
      rootDir: '/foo/base/rootDir',
      rootDirs: [ '/foo/base/rootDirs/1', '/foo/base/rootDirs/2' ],
      outFile: '/foo/base/outDile.js',
    }))

    // with manual overrides...

    ;({ options, diagnostics } = getCompilerOptions(files, 'ext/tsconfig.json', {
      // will be overridden
      module: ModuleKind.ESNext,
      // those will be resolved
      outDir: './outDir',
      rootDir: './rootDir',
      rootDirs: [ './rootDirs/1', './rootDirs/2' ],
      outFile: './outDile.js',
    }))
    expect(diagnostics.length).to.eql(0)
    expect(options).to.eql(Object.assign(getDefaultCompilerOptions(), {
      module: ModuleKind.ESNext,
      configFilePath: '/foo/ext/tsconfig.json',
      outDir: '/foo/outDir',
      rootDir: '/foo/rootDir',
      rootDirs: [ '/foo/rootDirs/1', '/foo/rootDirs/2' ],
      outFile: '/foo/outDile.js',
    }))
  })

  it('should fail on issues reading an extended configuration file', () => {
    const files = new Files('/foo' as DirectoryPath)
    files.add('base/wrong.json', { contents: '{"compilerOptions":{"module":"wrong"}}' })
    files.add('miss/tsconfig.json', { contents: '{"extends":"../base/missing.json"}' })
    files.add('wrong/tsconfig.json', { contents: '{"extends":"../base/wrong.json"}' })

    let { options, diagnostics } = getCompilerOptions(files, 'miss/tsconfig.json')
    expect(options).to.eql({})
    expect(diagnostics.length).to.equal(1)
    expect(diagnostics[0].code).to.equal(5083)
    expect(diagnostics[0].messageText).to.match(/base\/missing\.json/)
    expect(diagnostics[0].category).to.equal(DiagnosticCategory.Error)

    // hmm... here we seem to loose that "module" was declared in another file
    ;({ options, diagnostics } = getCompilerOptions(files, 'wrong/tsconfig.json'))
    expect(options).to.eql({})
    expect(diagnostics.length).to.equal(1)
    expect(diagnostics[0].code).to.equal(6046)
    expect(diagnostics[0].messageText).to.match(/module/)
    expect(diagnostics[0].category).to.equal(DiagnosticCategory.Error)
  })

  it('should detect circular dependencies when reading extended configurations', () => {
    const files = new Files('/foo' as DirectoryPath)
    files.add('tsconfig.json', { contents: '{"extends":"./one/tsconfig.json"}' })
    files.add('one/tsconfig.json', { contents: '{"extends":"../two/tsconfig.json"}' })
    files.add('two/tsconfig.json', { contents: '{"extends":"../tsconfig.json"}' })

    const { options, diagnostics } = getCompilerOptions(files, 'tsconfig.json')
    expect(options).to.eql({})
    expect(diagnostics.length).to.eql(1)
    expect(diagnostics[0].code).to.equal(18000)
    expect(diagnostics[0].category).to.equal(DiagnosticCategory.Error)
    expect(diagnostics[0].messageText).to.equal(
        'Circularity detected while resolving configuration "tsconfig.json"\n' +
        ' - two/tsconfig.json\n' +
        ' - one/tsconfig.json\n' +
        ' - tsconfig.json',
    )
  })
})
