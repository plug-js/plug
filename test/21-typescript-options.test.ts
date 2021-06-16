import { expect } from 'chai'
import { DiagnosticCategory, getDefaultCompilerOptions, ModuleKind } from 'typescript'
import { getCompilerOptions } from '../src/typescript/options'
import { VirtualFileList } from '../src/files'

describe('TypeScript Compiler Options', () => {
  it('should return the default options or fail', () => {
    const files = VirtualFileList.builder('/foo').build()

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
    const files = VirtualFileList
        .builder('/foo')
        .add('tsconfig.json', '{"compilerOptions":{"module":"commonjs"}}')
        .add('wrong.json', '{"compilerOptions":{"module":"wrong"}}')
        .build()

    let { options, diagnostics } = getCompilerOptions(files)
    expect(options).to.eql({
      configFilePath: '/foo/tsconfig.json',
      module: ModuleKind.CommonJS,
    })
    expect(diagnostics.length).to.eql(0)

    ;({ options, diagnostics } = getCompilerOptions(files, 'wrong.json'))
    expect(options).to.eql({})
    expect(diagnostics.length).to.equal(1)
    expect(diagnostics[0].code).to.equal(6046)
    expect(diagnostics[0].messageText).to.match(/module/)
    expect(diagnostics[0].category).to.equal(DiagnosticCategory.Error)
  })

  it('should read an extended configuration file', () => {
    const files = VirtualFileList
        .builder('/foo')
        .add('base/tsconfig.json', '{"compilerOptions":{"module":"commonjs"}}')
        .add('base/wrong.json', '{"compilerOptions":{"module":"wrong"}}')
        .add('ext/tsconfig.json', '{"extends":"../base/tsconfig.json"}')
        .add('miss/tsconfig.json', '{"extends":"../base/missing.json"}')
        .add('wrong/tsconfig.json', '{"extends":"../base/wrong.json"}')
        .build()

    let { options, diagnostics } = getCompilerOptions(files, 'ext/tsconfig.json')
    expect(options).to.eql({
      configFilePath: '/foo/ext/tsconfig.json',
      module: ModuleKind.CommonJS,
    })
    expect(diagnostics.length).to.eql(0)

    ;({ options, diagnostics } = getCompilerOptions(files, 'miss/tsconfig.json'))
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
    const files = VirtualFileList
        .builder('/foo')
        .add('tsconfig.json', '{"extends":"./one/tsconfig.json"}')
        .add('one/tsconfig.json', '{"extends":"../two/tsconfig.json"}')
        .add('two/tsconfig.json', '{"extends":"../tsconfig.json"}')
        .build()

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