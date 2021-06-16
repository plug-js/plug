import { expect } from 'chai'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { glob } from '../src/utils/globs'
import { DirectoryPath } from '../src/utils/paths'

function findDirectory(directory: string): string {
  if (existsSync(resolve(directory, 'package.json'))) return directory
  const parent = dirname(directory)
  if (directory === parent) throw new Error('File "package.json" not found')
  return findDirectory(parent)
}

// This directory _may_ be relocated under build, so find it...
const directory = resolve(findDirectory(__dirname), 'test', 'support') as DirectoryPath

describe('Virtual File System Globs', () => {
  it('should prepare a virtual file system from some globs', async () => {
    const list = await glob(directory, [ '*' ])
    const files = list.list().map((file) => file.relativePath)
    expect(files).to.have.length.greaterThan(1)
    expect(files).to.include('build.ts')
  })

  it('should prepare a virtual file system from some globs and options', async () => {
    const list = await glob(directory, [ '*' ], { ignore: [ '*.ts' ] })
    const files = list.list().map((file) => file.relativePath)
    expect(files).to.have.length.greaterThan(1)
    expect(files).not.to.include('build.ts')
  })
})
