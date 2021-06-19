import { expect } from 'chai'
import { ReadPlug } from '../src/plugs/read'
import { Files } from '../src/files'
import { PlugPipe } from '../src/pipe'
import { directory } from './support'

describe('Plug Read', function() {
  it('should be installed', () => {
    expect(new PlugPipe().read).to.be.a('function')
  })

  it('should read a directory using globs', async () => {
    const input = new Files(directory)

    const output = await new ReadPlug('*').process(input)

    const files = output.list().map((file) => file.relativePath)
    expect(files).to.have.length.greaterThan(1)
    expect(files).to.include('build.ts')
  })

  it('should read a directory using globs', async () => {
    const input = new Files(directory)

    const output = await new ReadPlug('*', { ignore: [ '*.ts' ] }).process(input)

    const files = output.list().map((file) => file.relativePath)
    expect(files).to.have.length.greaterThan(1)
    expect(files).to.not.include('build.ts')
  })
})
