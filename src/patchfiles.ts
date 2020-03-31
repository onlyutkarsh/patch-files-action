import fg from "fast-glob";

export async function patchFiles(files: string[], patchSyntax: string): Promise<boolean> {
    return true;
}

export async function findFilesInDir(files: string[]): Promise<string[]> {

    let paths = await fg(files, <fg.Options>{ dot: true, cwd: process.cwd() });
    return paths;

}

export function parsePatchSyntax(patchSyntax: string): boolean {
    return true;
}