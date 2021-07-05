// import { mkdtemp } from './asyncfs'
// import { Files } from '../files'
// import { Project } from '../project'
// import { createDirectoryPath, DirectoryPath } from './paths'

// export function mktempdir(files: Files, prefix?: string): Promise<DirectoryPath>
// export function mktempdir(project: Project, prefix?: string): Promise<DirectoryPath>
// export async function mktempdir(where: Files | Project, prefix: string = '.plug-'): Promise<DirectoryPath> {
//   const base = createDirectoryPath(where.directory, prefix)
//   const directory = await mkdtemp(base)
//   return directory as DirectoryPath
// }
