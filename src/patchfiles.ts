import * as glob from "@actions/glob";

export async function patchFiles(files: string[], patchSyntax: string): Promise<boolean> {

    return true;
}

export async function globFiles(patterns: string, followSymbolicLinks: string = "true"): Promise<glob.Globber> {
    const globOptions = {
        followSymbolicLinks: followSymbolicLinks.toUpperCase() !== "FALSE"
    };

    let globber = await glob.create(patterns, globOptions);
    return globber;

}

export function parsePatchSyntax(patchSyntax: string): boolean {
    return true;
}