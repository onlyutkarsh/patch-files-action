const bomRegex = /^\uFEFF/;

export interface IBomDetectResult {
    hadBOM: boolean;
    content: string;
}

export function removeBom(content: string): IBomDetectResult {
    const hasBomMatch = content.match(bomRegex);
    const hasBom = hasBomMatch && hasBomMatch.length > 0;
    return {
        hadBOM: hasBom || false,
        content: hasBom ? content.replace(bomRegex, "") : content
    };
}

export function restoreBom(file: IBomDetectResult): string {
    if (file.hadBOM) {
        return `\uFEFF${file.content}`;
    }
    return file.content;
}
