import { CompilePlug } from '../src/plugs/compile'
import { PlugPipe } from '../src/pipe'
import { expect } from 'chai'
import { disableLogs, mock } from './support'

describe('Plug TypeScript Compiler', function() {
  // compiling takes time...
  this.timeout(5000)
  this.slow(2000)

  disableLogs()

  it('should be installed', () => {
    expect(new PlugPipe().compile).to.be.a('function')
  })

  it('should compile', () => {
    const compiler = new CompilePlug()

    const { files, run, log } = mock('/foo')
    const original = files.add('test.ts', { contents: 'void 0' })

    const output = compiler.process(files, run, log)
    expect(output.list()).to.eql([ {
      absolutePath: '/foo/test.js',
    } ])

    const compiled = output.get('test.js')!
    expect(compiled.originalFile).to.equal(original)
  })

  it('should compile with a default tsconfig.json', () => {
    const { files, run, log } = mock('/foo')

    const config = files.add('tsconfig.json', { contents: '{"compilerOptions":{"outDir":"out"}}' })
    const source = files.add('test.ts', { contents: 'void 0' })

    const output1 = new CompilePlug().process(files, run, log)
    expect(output1.list()).to.eql([
      { absolutePath: '/foo/out/test.js' },
    ])
    expect(output1.get('out/test.js')?.originalFile).to.equal(source)

    const output2 = new CompilePlug({ passThrough: true }).process(files, run, log)
    expect(output2.list().sort()).to.eql([
      { absolutePath: '/foo/out/test.js' },
      { absolutePath: '/foo/out/tsconfig.json' },
    ])
    expect(output2.get('out/test.js')?.originalFile).to.equal(source)
    expect(output2.get('out/tsconfig.json')?.originalFile).to.equal(config)
  })

  it('should compile with a specific config file', () => {
    const { files, run, log } = mock('/foo')

    files.add('options.json', { contents: '{"compilerOptions":{"outDir":"out"}}' })
    files.add('test.ts', { contents: 'void 0' })

    const output1 = new CompilePlug('options.json').process(files, run, log)
    expect(output1.list()).to.eql([
      { absolutePath: '/foo/out/test.js' },
    ])

    const output2 = new CompilePlug('options.json', { passThrough: true }).process(files, run, log)
    expect(output2.list().sort()).to.eql([
      { absolutePath: '/foo/out/options.json' },
      { absolutePath: '/foo/out/test.js' },
    ])
  })

  it('should compile and copy resources in the same directory', () => {
    const { files, run, log } = mock('/foo')

    files.add('tsconfig.json', { contents: '{"compilerOptions":{"rootDir":"from"}}' })
    const typescript = files.add('from/typescript.ts', { contents: 'import "./javascript"' })
    const resource = files.add('from/resource.json', { contents: '{}' })

    const output1 = new CompilePlug({ allowJs: false, passThrough: false }).process(files, run, log)
    expect(output1.list()).to.eql([
      { absolutePath: '/foo/from/typescript.js' },
    ])
    expect(output1.get('from/typescript.js')?.originalFile).to.equal(typescript)

    const output2 = new CompilePlug({ allowJs: false, passThrough: true }).process(files, run, log)
    expect(output2.list().sort()).to.eql([
      { absolutePath: '/foo/from/resource.json' },
      { absolutePath: '/foo/from/typescript.js' },
    ])

    expect(output2.get('from/typescript.js')?.originalFile).to.equal(typescript)
    expect(output2.get('from/resource.json')).to.equal(resource)
  })

  it('should compile javascript to a different directory', () => {
    const { files, run, log } = mock('/foo')

    files.add('tsconfig.json', { contents: '{"compilerOptions":{"rootDir":"from","outDir":"to"}}' })
    const typescript = files.add('from/typescript.ts', { contents: 'import "./javascript"' })
    const javascript = files.add('from/javascript.js', { contents: 'void 0' })
    const resource = files.add('from/resource.json', { contents: '{}' })

    const output1 = new CompilePlug({ allowJs: false, passThrough: false }).process(files, run, log)
    expect(output1.list()).to.eql([
      { absolutePath: '/foo/to/typescript.js' },
    ])
    expect(output1.get('to/typescript.js')?.originalFile).to.equal(typescript)

    const output2 = new CompilePlug({ allowJs: true, passThrough: false }).process(files, run, log)
    expect(output2.list().sort()).to.eql([
      { absolutePath: '/foo/to/javascript.js' },
      { absolutePath: '/foo/to/typescript.js' },
    ])
    expect(output2.get('to/typescript.js')?.originalFile).to.equal(typescript)
    expect(output2.get('to/javascript.js')?.originalFile).to.equal(javascript)

    const output3 = new CompilePlug({ allowJs: false, passThrough: true }).process(files, run, log)
    expect(output3.list().sort()).to.eql([
      { absolutePath: '/foo/to/javascript.js' },
      { absolutePath: '/foo/to/resource.json' },
      { absolutePath: '/foo/to/typescript.js' },
    ])

    expect(output3.get('to/typescript.js')?.originalFile).to.equal(typescript)
    expect(output3.get('to/javascript.js')?.originalFile).to.equal(javascript)
    expect(output3.get('to/resource.json')?.originalFile).to.equal(resource)

    const output4 = new CompilePlug({ allowJs: true, passThrough: true }).process(files, run, log)
    expect(output4.list().sort()).to.eql([
      { absolutePath: '/foo/to/javascript.js' },
      { absolutePath: '/foo/to/resource.json' },
      { absolutePath: '/foo/to/typescript.js' },
    ])

    expect(output4.get('to/typescript.js')?.originalFile).to.equal(typescript)
    expect(output4.get('to/javascript.js')?.originalFile).to.equal(javascript)
    expect(output4.get('to/resource.json')?.originalFile).to.equal(resource)
  })
})
