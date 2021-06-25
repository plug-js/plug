import { CompilePlug } from '../src/plugs/compile'
import { PlugPipe } from '../src/pipe'
import { expect } from 'chai'
import { mock } from './support'

describe('Plug TypeScript Compiler', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  it('should be installed', () => {
    expect(new PlugPipe().compile).to.be.a('function')
  })

  it('should compile', () => {
    const compiler = new CompilePlug()

    const { files, run, log } = mock('/foo')
    files.add('test.ts', { contents: 'void 0' })

    const output = compiler.process(files, run, log)
    expect(output.list()).to.eql([ {
      absolutePath: '/foo/test.js',
      originalPath: '/foo/test.ts',
    } ])
  })

  it('should compile with a default tsconfig.json', () => {
    const { files, run, log } = mock('/foo')

    files.add('tsconfig.json', { contents: '{"compilerOptions":{"outDir":"out"}}' })
    files.add('test.ts', { contents: 'void 0' })

    const output1 = new CompilePlug().process(files, run, log)
    expect(output1.list()).to.eql([
      { absolutePath: '/foo/out/test.js', originalPath: '/foo/test.ts' },
    ])

    const output2 = new CompilePlug({ passThrough: true }).process(files, run, log)
    expect(output2.list().sort()).to.eql([
      { absolutePath: '/foo/out/test.js', originalPath: '/foo/test.ts' },
      { absolutePath: '/foo/out/tsconfig.json', originalPath: '/foo/tsconfig.json' },
    ])
  })

  it('should compile with a specific config file', () => {
    const { files, run, log } = mock('/foo')

    files.add('options.json', { contents: '{"compilerOptions":{"outDir":"out"}}' })
    files.add('test.ts', { contents: 'void 0' })

    const output1 = new CompilePlug('options.json').process(files, run, log)
    expect(output1.list()).to.eql([
      { absolutePath: '/foo/out/test.js', originalPath: '/foo/test.ts' },
    ])

    const output2 = new CompilePlug('options.json', { passThrough: true }).process(files, run, log)
    expect(output2.list().sort()).to.eql([
      { absolutePath: '/foo/out/options.json', originalPath: '/foo/options.json' },
      { absolutePath: '/foo/out/test.js', originalPath: '/foo/test.ts' },
    ])
  })

  it('should compile also javascript files and copy resources', () => {
    const { files, run, log } = mock('/foo')

    files.add('tsconfig.json', { contents: '{"compilerOptions":{"rootDir":"from","outDir":"to"}}' })
    files.add('from/typescript.ts', { contents: 'import "./javascript"' })
    files.add('from/javascript.js', { contents: 'void 0' })
    files.add('from/resource.json', { contents: '{}' })

    const output1 = new CompilePlug({ allowJs: false, passThrough: false }).process(files, run, log)
    expect(output1.list()).to.eql([
      { absolutePath: '/foo/to/typescript.js', originalPath: '/foo/from/typescript.ts' },
    ])

    const output2 = new CompilePlug({ allowJs: true, passThrough: false }).process(files, run, log)
    expect(output2.list()).to.eql([
      { absolutePath: '/foo/to/javascript.js', originalPath: '/foo/from/javascript.js' },
      { absolutePath: '/foo/to/typescript.js', originalPath: '/foo/from/typescript.ts' },
    ])

    const output3 = new CompilePlug({ allowJs: false, passThrough: true }).process(files, run, log)
    expect(output3.list().sort()).to.eql([
      { absolutePath: '/foo/to/javascript.js', originalPath: '/foo/from/javascript.js' },
      { absolutePath: '/foo/to/resource.json', originalPath: '/foo/from/resource.json' },
      { absolutePath: '/foo/to/typescript.js', originalPath: '/foo/from/typescript.ts' },
    ])

    const output4 = new CompilePlug({ allowJs: true, passThrough: true }).process(files, run, log)
    expect(output4.list().sort()).to.eql([
      { absolutePath: '/foo/to/javascript.js', originalPath: '/foo/from/javascript.js' },
      { absolutePath: '/foo/to/resource.json', originalPath: '/foo/from/resource.json' },
      { absolutePath: '/foo/to/typescript.js', originalPath: '/foo/from/typescript.ts' },
    ])
  })
})