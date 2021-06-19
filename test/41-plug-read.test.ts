import { expect } from 'chai'
import { ReadPlug } from '../src/plugs/read'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { DirectoryPath } from '../src/utils/paths'
import { Files } from '../src/files'
import { PlugPipe } from '../src/pipe'

function findDirectory(directory: string): string {
  if (existsSync(resolve(directory, 'package.json'))) return directory
  const parent = dirname(directory)
  if (directory === parent) throw new Error('File "package.json" not found')
  return findDirectory(parent)
}

// This directory _may_ be relocated under build, so find it...
const directory = resolve(findDirectory(__dirname), 'test', 'support') as DirectoryPath

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
