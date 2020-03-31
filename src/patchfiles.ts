import * as glob from "@actions/glob";

export async function patchFiles(files: string[], patchSyntax: string): Promise<boolean> {
    const parsedContent = expandVariable(patchSyntax);
    console.log(parsedContent);
    return true;
}

export function expandVariable(str: string): string {
    let varRegex = /\$\{{(.*?)\}}/g;
    return str.replace(varRegex, (match, varName, offset, string) => {
        return process.env[varName.trim()] || "";
    });
}

export async function globFiles(patterns: string, followSymbolicLinks: string = "false"): Promise<glob.Globber> {
    const globOptions = {
        followSymbolicLinks: followSymbolicLinks.toUpperCase() !== "FALSE"
    };

    let globber = await glob.create(patterns);
    return globber;

}

export function parsePatchSyntax(patchSyntax: string): boolean {
    return true;
}