import { expect } from 'chai'
import { RawSourceMap } from 'source-map'
import { PlugPipe } from '../src/pipe'
import { MochaOptions, MochaPlug } from '../src/plugs/mocha'
import { disableLogs, mock } from './support'

describe('Plug Mocha Processor', () => {
  const { files: input, run, log } = mock('/foo')

  const testSource = input.add('test/mytest.ts', { contents: 'testOriginal', sourceMap: false })
  input.add('test/mytest.js', {
    contents: 'testCompiled',
    sourceMap: { version: 3 } as RawSourceMap,
    originalFile: testSource,
  })

  const codeSource = input.add('src/testable.ts', { contents: 'codeOriginal', sourceMap: false })
  input.add('src/testable.js', {
    contents: 'codeCompiled',
    sourceMap: { version: 3 } as RawSourceMap,
    originalFile: codeSource,
  })

  input.add('utils/extra.js', { contents: 'utility', sourceMap: false })

  let mochaArgs: Parameters<MochaPlug['runMocha']> | undefined = undefined
  let failures = 0

  class TestMochaPlug extends MochaPlug {
    constructor(glob: string, options: MochaOptions = {}) {
      super(glob, options)
    }
    runMocha(...args: Parameters<MochaPlug['runMocha']>): ReturnType<MochaPlug['runMocha']> {
      mochaArgs = args
      return Promise.resolve(failures)
    }
  }

  /* ======================================================================== */

  disableLogs()

  beforeEach(() => {
    mochaArgs = undefined
    failures = 0
  })

  it('should be installed', async () => {
    expect(new PlugPipe().mocha).to.be.a('function')
  })

  it('should process some test files', async () => {
    const mocha = new TestMochaPlug('test/**/*.ts')

    const output = await mocha.process(input, run, log)
    expect(output).to.equal(input)

    expect(mochaArgs).to.be.an('array').with.length(1)

    const { files, tests, options } = mochaArgs![0]

    expect(files).to.have.length(3)
    expect(files).to.have.keys([
      '/foo/src/testable.js',
      '/foo/test/mytest.js',
      '/foo/utils/extra.js',
    ])
    expect(files.get('/foo/test/mytest.js' as any))
        .to.equal('testCompiled\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXl0ZXN0LmpzIiwic291cmNlcyI6W10sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiIifQ==')
    expect(files.get('/foo/src/testable.js' as any))
        .to.equal('codeCompiled\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGFibGUuanMiLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiJ9')
    expect(files.get('/foo/utils/extra.js' as any)).to.equal('utility')

    expect(tests).to.have.length(1)
    expect(tests).to.include('/foo/test/mytest.js')

    expect(options).to.eql({})
  })

  it('should process some test files matching absolute paths', async () => {
    const mocha = new TestMochaPlug('test/**/*.js', {
      matchOriginalPaths: false, // also test other options
      reporter: 'foobar',
    })

    const output = await mocha.process(input, run, log)
    expect(output).to.equal(input)

    expect(mochaArgs).to.be.an('array').with.length(1)

    const { files, tests, options } = mochaArgs![0]

    expect(files).to.have.length(3)
    expect(files).to.have.keys([
      '/foo/src/testable.js',
      '/foo/test/mytest.js',
      '/foo/utils/extra.js',
    ])
    expect(files.get('/foo/test/mytest.js' as any))
        .to.equal('testCompiled\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXl0ZXN0LmpzIiwic291cmNlcyI6W10sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiIifQ==')
    expect(files.get('/foo/src/testable.js' as any))
        .to.equal('codeCompiled\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGFibGUuanMiLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiJ9')
    expect(files.get('/foo/utils/extra.js' as any)).to.equal('utility')

    expect(tests).to.have.length(1)
    expect(tests).to.include('/foo/test/mytest.js')

    expect(options).to.eql({
      matchOriginalPaths: false,
      reporter: 'foobar',
    })
  })

  it('should fail when no tests are found', async () => {
    const mocha = new TestMochaPlug('nowhere/**/*.js')

    await expect(mocha.process(input, run, log))
        .to.be.rejectedWith('Build failed: No test files found')
  })

  it('should fail when failures are detected', async () => {
    const mocha = new TestMochaPlug('test/**/*.ts')

    failures = 12
    await expect(mocha.process(input, run, log))
        .to.be.rejectedWith('Mocha detected 12 test failures')

    failures = 1 // singular
    await expect(mocha.process(input, run, log))
        .to.be.rejectedWith('Mocha detected 1 test failure')
  })

  describe('Forking Mocha', function() {
    this.slow(2000)

    it('should run a remote test', async () => {
      const mocha = new MochaPlug('**/*.js', { matchOriginalPaths: false })
      const { files, run, log } = mock('/foo')
      files.add('test.js', {
        contents: 'it("runs", () => { /* all good */ })',
        sourceMap: false,
      })

      // the test fails, doh!
      await expect(mocha.process(files, run, log))
    })

    it('should run a remote failing test', async () => {
      const mocha = new MochaPlug('**/*.js', { matchOriginalPaths: false })
      const { files, run, log } = mock('/foo')
      files.add('test.js', {
        contents: 'it("runs", () => { throw new Error("Foo!") })',
        sourceMap: false,
      })

      // the test fails, doh!
      await expect(mocha.process(files, run, log))
          .to.be.rejectedWith('Mocha detected 1 test failure')
    })

    it('should run a remote compilation test', async () => {
      const mocha = new MochaPlug('**/*.js', { matchOriginalPaths: false })
      const { files, run, log } = mock('/foo')
      files.add('test.js', {
        contents: 'yo, this is NOT javascript!',
        sourceMap: false,
      })

      // the test fails, doh!
      await expect(mocha.process(files, run, log))
          .to.be.rejectedWith('Mocha failed with error code 1')
    })
  })
})
