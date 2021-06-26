import { expect } from 'chai'
import { FilePath } from '../src/utils/paths'
import { Failure } from '../src/failure'
import { PlugPipe } from '../src/pipe'
import { MochaPlug } from '../src/plugs/mocha'
import { mock } from './support'

describe.skip('Plug Mocha Processor', () => {
  it('should be installed', () => {
    expect(new PlugPipe().mocha).to.be.a('function')
  })

  it('should have some default options', () => {
    const mocha = new MochaPlug('**/*.ts')
    expect(mocha).to.have.property('options').eql({ matchOriginalPaths: true })
  })

  it('should not run without files', async () => {
    const { files, run, log } = mock('/foo')

    const mocha = new MochaPlug('**/*.ts', { reporter: 'null' })
    await expect(mocha.process(files, run, log))
        .to.be.rejectedWith(Failure, 'No test files found')
  })

  it('should run without failures', async () => {
    const { files, run, log } = mock('/foo')
    files.add('test.js', {
      contents: 'it("runs", ()=>{})',
      originalPath: '/foo/test.ts' as FilePath,
    })

    const mocha = new MochaPlug('**/*.ts', { reporter: 'null' })
    await mocha.process(files, run, log)
  })

  it('should fail with failures', async () => {
    const { files, run, log } = mock('/foo')
    files.add('test.js', {
      contents: 'it("fails", ()=>{ throw new Error() })',
      originalPath: '/foo/test.ts' as FilePath,
    })

    const mocha1 = new MochaPlug('**/*.ts', { reporter: 'null' })
    await expect(mocha1.process(files, run, log))
        .to.be.rejectedWith(Failure, 'Mocha detected 1 test failure')

    files.add('test2.js', {
      contents: 'it("fails too", ()=>{ throw new Error() })',
      originalPath: '/foo/test2.ts' as FilePath,
    })

    const mocha2 = new MochaPlug('**/*.ts', { reporter: 'null' })
    await expect(mocha2.process(files, run, log))
        .to.be.rejectedWith(Failure, 'Mocha detected 2 test failures')
  })

  it('should fail with compilation errors', async () => {
    const { files, run, log } = mock('/foo')
    files.add('test.js', {
      contents: 'this is not javascript!',
      originalPath: '/foo/test.ts' as FilePath,
    })

    const mocha = new MochaPlug('**/*.js', {
      matchOriginalPaths: false,
      reporter: 'null',
    })

    await expect(mocha.process(files, run, log))
        .to.be.rejectedWith(SyntaxError)
  })
})
