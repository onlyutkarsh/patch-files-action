import fs from "fs";
import * as patcher from "../src/patcher";
import { JsonPatcher } from "../src/JsonPatcher";
import * as index from "../src/index";
import * as core from "@actions/core";
import * as bom from "../src/bom";

jest.mock("@actions/core");

let inputJson = {
    "version": "1.0.0",
    "keywords": [],
    "author": "onlyutkarsh",
    "bugs": {
        "url": "http://www.dummy.com"
    }
};

describe("index.ts tests", () => {
    beforeEach(async () => {
        fs.mkdirSync("temp");

        fs.writeFileSync("temp/test.json", JSON.stringify(inputJson));
    });

    afterEach(async () => {
        fs.rmSync("temp", { recursive: true, force: true });

        jest.restoreAllMocks();
    });

    test("validate all inputs are read correctly", async () => {
        //mock core.getInput
        const inputSpy = jest.spyOn(core, "getInput");

        await index.run();
        expect(inputSpy).toHaveBeenCalledWith("files", { "required": true });
        expect(inputSpy).toHaveBeenCalledWith("patch-syntax", { "required": true });
        expect(inputSpy).toHaveBeenCalledWith("output-patched-file");
        expect(inputSpy).toHaveBeenCalledWith("fail-if-no-files-patched");
        expect(inputSpy).toHaveBeenCalledWith("fail-if-error");
    });

    test("find matching files in a directory should return one file", async () => {
        let pattern = ["temp/*.json"];
        let files = pattern.join("\n");
        let paths = await patcher.globFilesAsync(files);
        expect(paths.length).toEqual(1);
    });

    test("find matching files with multiple patterns should work", async () => {
        // Create additional test files
        fs.writeFileSync("temp/test2.json", JSON.stringify(inputJson));
        fs.writeFileSync("temp/test.txt", "not a json file");

        let patterns = ["temp/*.json", "temp/*.txt"];
        let files = patterns.join("\n");
        let paths = await patcher.globFilesAsync(files);

        // Should find 2 json files and 1 txt file
        expect(paths.length).toEqual(3);
        expect(paths.some(p => p.includes("test.json"))).toBe(true);
        expect(paths.some(p => p.includes("test2.json"))).toBe(true);
        expect(paths.some(p => p.includes("test.txt"))).toBe(true);
    });

    test("find matching files should ignore empty lines in pattern", async () => {
        let patterns = ["temp/*.json", "", "  ", "\n"];
        let files = patterns.join("\n");
        let paths = await patcher.globFilesAsync(files);

        // Should only find the json file, ignoring empty patterns
        expect(paths.length).toEqual(1);
    });

    test("directory pattern without wildcards should match all files recursively", async () => {
        // Create nested directory structure
        fs.mkdirSync("temp/subdir", { recursive: true });
        fs.writeFileSync("temp/subdir/nested.json", JSON.stringify(inputJson));
        fs.writeFileSync("temp/subdir/nested2.json", JSON.stringify(inputJson));

        // Test directory pattern without trailing slash
        let paths = await patcher.globFilesAsync("temp");
        expect(paths.length).toBeGreaterThanOrEqual(3); // At least test.json, nested.json, nested2.json

        // Test directory pattern with trailing slash
        let paths2 = await patcher.globFilesAsync("temp/");
        expect(paths2.length).toBeGreaterThanOrEqual(3);

        // Test subdirectory pattern
        let paths3 = await patcher.globFilesAsync("temp/subdir");
        expect(paths3.length).toEqual(2); // nested.json, nested2.json
    });

    test("directory pattern should work with patchAsync", async () => {
        // Create nested structure
        fs.mkdirSync("temp/config", { recursive: true });
        fs.writeFileSync("temp/config/app.json", JSON.stringify(inputJson));
        fs.writeFileSync("temp/config/settings.json", JSON.stringify(inputJson));

        let patchSyntax = ['= /version => "2.0.0"'];

        let result = await patcher.patchAsync(
            "temp/config", // Directory pattern without wildcards
            patchSyntax.join("\n"),
            false,
            false,
            false
        );

        expect(result).toBe(true);

        // Verify both files were patched
        let appContent = JSON.parse(fs.readFileSync("temp/config/app.json", { encoding: "utf8" }));
        let settingsContent = JSON.parse(fs.readFileSync("temp/config/settings.json", { encoding: "utf8" }));
        expect(appContent.version).toEqual("2.0.0");
        expect(settingsContent.version).toEqual("2.0.0");
    });

    test("single file pattern should work (most common use case)", async () => {
        // Test exact file path without glob characters
        let paths = await patcher.globFilesAsync("temp/test.json");
        expect(paths.length).toEqual(1);
        expect(paths[0]).toContain("test.json");
    });

    test("single file pattern should work with patchAsync", async () => {
        let patchSyntax = ['= /version => "5.0.0"'];

        let result = await patcher.patchAsync(
            "temp/test.json", // Single file - most common use case
            patchSyntax.join("\n"),
            false,
            false,
            false
        );

        expect(result).toBe(true);

        // Verify file was patched
        let content = JSON.parse(fs.readFileSync("temp/test.json", { encoding: "utf8" }));
        expect(content.version).toEqual("5.0.0");
    });

    test("parse patch syntax and validate its json-patch compatible", async () => {

        let patchSyntax = [
            "= /version => \"1.0.1\"",
            "= /author => \"utkarsh\"",
            "+ /bugs/name => \"Google\"",
            "= /bugs/url => \"https://www.google.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));

        expect(operation.length).toEqual(4);
    });

    test("patch syntax with no leading / in path should throw exception if failIfError = true", async () => {

        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= version => \"1.0.1\"",
                    ].join("\n");
                case "fail-if-error": return "true"; //should throw if true
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).toHaveBeenCalledWith("Path should start with a leading slash. Please verify path 'version' at index: '0'");

    });

    test("patch syntax with no leading / in path should *NOT* throw exception if failIfError = false", async () => {

        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= version => \"1.0.1\"",
                    ].join("\n");
                case "fail-if-error": return "false"; //should throw if true
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).not.toHaveBeenCalledWith();

    });

    test("invalid operator in patch syntax should throw exception if failIfError = true", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "& /version => \"1.0.1\"", //"Operator '&' is no supported."
                    ].join("\n");
                case "output-patched-file": return "true";
                case "fail-if-error": return "true";
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).toHaveBeenCalledWith("Operator '&' is not supported.");
    });

    test("invalid operator in patch syntax should *NOT* throw exception if failIfError = false", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "& /version => \"1.0.1\"", //"Operator '&' is no supported."
                    ].join("\n");
                case "output-patched-file": return "true";
                case "fail-if-error": return "false";
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).not.toHaveBeenCalledWith();
    });

    test("should throw exception if failIfNoFilesPatched = true and filesPatched = 0, it should ignore failIfError value", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= /version => \"1.0.1\"",
                        "= /author => \"utkarsh\"",
                        "+ /bugs/name => \"Google\"",
                        "= /bugs/url => \"https://www.google.com\""
                    ].join("\n");
                case "output-patched-file": return "false";
                case "fail-if-error": return "false";
                case "fail-if-no-files-patched": return "true"; //for throw error if set to true
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).toHaveBeenCalledWith("No files were patched");

    });

    test("should *NOT* throw exception if failIfNoFilesPatched = false, failIfError=false and filesPatched = 0", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= /version => \"1.0.1\"",
                        "= /author => \"utkarsh\"",
                        "+ /bugs/name => \"Google\"",
                        "= /bugs/url => \"https://www.google.com\""
                    ].join("\n");
                case "output-patched-file": return "false";
                case "fail-if-error": return "false";
                case "fail-if-no-files-patched": return "false"; //for throw error if set to true
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).not.toHaveBeenCalledWith();

    });

    test("apply patch and validate json", () => {

        let patchSyntax = [
            "= /version => \"1.0.1\"",
            "= /author => \"Utkarsh Shigihalli\"",
            "+ /bugs/name => \"Google\"",
            "= /bugs/url => \"https://www.google.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        let expectedResponse = {
            "version": "1.0.1",
            "keywords": [],
            "author": "Utkarsh Shigihalli",
            "bugs": {
                "url": "https://www.google.com",
                "name": "Google"
            }
        };

        // Parse both to compare the actual JSON structure, not formatting
        expect(JSON.parse(response)).toEqual(expectedResponse);

    });

    test("add multiple elements to file", () => {
        let patchSyntax = [
            "+ /license => \"MIT\"",
            "+ /repository => \"https://github.com/test/repo\"",
            "+ /bugs/email => \"bugs@example.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.license).toEqual("MIT");
        expect(result.repository).toEqual("https://github.com/test/repo");
        expect(result.bugs.email).toEqual("bugs@example.com");
    });

    test("replace multiple tokens in file", () => {
        let patchSyntax = [
            "= /version => \"2.0.0\"",
            "= /author => \"Jane Doe\"",
            "= /bugs/url => \"https://newurl.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.version).toEqual("2.0.0");
        expect(result.author).toEqual("Jane Doe");
        expect(result.bugs.url).toEqual("https://newurl.com");
    });

    test("remove single token in file", () => {
        let patchSyntax = [
            "- /author"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.author).toBeUndefined();
        expect(result.version).toEqual("1.0.0"); // other fields should remain
    });

    test("remove multiple tokens in file", () => {
        let patchSyntax = [
            "- /keywords",
            "- /bugs/url"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.keywords).toBeUndefined();
        expect(result.bugs.url).toBeUndefined();
        expect(result.version).toEqual("1.0.0"); // other fields should remain
    });

    test("handle array patching - add to array", () => {
        let patchSyntax = [
            "+ /keywords/0 => \"testing\"",
            "+ /keywords/1 => \"github-actions\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.keywords).toContain("testing");
        expect(result.keywords).toContain("github-actions");
        expect(result.keywords.length).toEqual(2);
    });

    test("handle numeric values", () => {
        let patchSyntax = [
            "+ /downloads => 1000",
            "+ /rating => 4.5"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.downloads).toEqual(1000);
        expect(result.rating).toEqual(4.5);
    });

    test("handle boolean values", () => {
        let patchSyntax = [
            "+ /private => true",
            "+ /deprecated => false"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.private).toEqual(true);
        expect(result.deprecated).toEqual(false);
    });

    test("handle null values", () => {
        let patchSyntax = [
            "+ /homepage => null"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.homepage).toBeNull();
    });

    test("handle object values", () => {
        let patchSyntax = [
            '+ /config => {"timeout": 30, "retries": 3}'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.config).toEqual({ timeout: 30, retries: 3 });
    });

    test("handle array values", () => {
        let patchSyntax = [
            '= /keywords => ["test", "ci", "automation"]'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.keywords).toEqual(["test", "ci", "automation"]);
    });

    test("handle deep nested paths", () => {
        let patchSyntax = [
            '+ /bugs/contact => {}',
            '+ /bugs/contact/email => "support@example.com"',
            '+ /bugs/contact/phone => "+1234567890"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.bugs.contact.email).toEqual("support@example.com");
        expect(result.bugs.contact.phone).toEqual("+1234567890");
    });

    test("handle BOM preservation", () => {
        const contentWithBOM = "\uFEFF" + JSON.stringify(inputJson);
        fs.writeFileSync("temp/bom-test.json", contentWithBOM, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "2.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/bom-test.json", { encoding: "utf8" }));

        expect(fileContent.hadBOM).toBe(true);

        let jp = new JsonPatcher();
        fileContent.content = jp.apply(fileContent.content, operation);

        let restoredContent = bom.restoreBom(fileContent);
        expect(restoredContent).toMatch(/^\uFEFF/);
    });

    test("mixed operations - add, replace, remove", () => {
        let patchSyntax = [
            '= /version => "3.0.0"',
            '+ /license => "Apache-2.0"',
            '- /keywords',
            '= /bugs/url => "https://issues.example.com"',
            '+ /bugs/type => "github"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.version).toEqual("3.0.0");
        expect(result.license).toEqual("Apache-2.0");
        expect(result.keywords).toBeUndefined();
        expect(result.bugs.url).toEqual("https://issues.example.com");
        expect(result.bugs.type).toEqual("github");
    });

    test("patch syntax with leading/trailing whitespace should be trimmed", () => {
        let patchSyntax = [
            "  = /version => \"1.0.1\"  ",
            "   + /author => \"Test\"   "
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));

        expect(operation.length).toEqual(2);
        expect(operation[0].op).toEqual("replace");
        expect(operation[1].op).toEqual("add");
    });

    test("stringify function should correctly format operations", () => {
        let addOp = { op: "add" as const, path: "/test", value: "value" };
        let removeOp = { op: "remove" as const, path: "/test" };
        let replaceOp = { op: "replace" as const, path: "/test", value: "newvalue" };

        expect(patcher.stringify(addOp)).toEqual('+ /test => "value"');
        expect(patcher.stringify(removeOp)).toEqual('- /test');
        expect(patcher.stringify(replaceOp)).toEqual('= /test => "newvalue"');
    });

    test("preserve JSON formatting with proper indentation", () => {
        // Create a properly formatted JSON file with 2-space indentation
        const formattedJson = JSON.stringify(inputJson, null, 2);
        fs.writeFileSync("temp/formatted.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "2.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/formatted.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output is properly formatted
        expect(response).toContain('\n  "version"');
        expect(response).toContain('\n  "keywords"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("2.0.0");
    });

    test("preserve JSON formatting with 4-space indentation", () => {
        // Create a properly formatted JSON file with 4-space indentation
        const formattedJson = JSON.stringify(inputJson, null, 4);
        fs.writeFileSync("temp/formatted4.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "3.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/formatted4.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output uses 4-space indentation
        expect(response).toContain('\n    "version"');
        expect(response).toContain('\n    "keywords"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("3.0.0");
    });

    test("malformed patch syntax should throw error with line number", () => {
        let patchSyntax = [
            '= /version => "1.0.1"',
            'this is a typo',  // This line doesn't match the pattern
            '+ /author => "Test"'
        ];

        expect(() => {
            patcher.parsePatchSyntax(patchSyntax.join("\n"));
        }).toThrow("Unable to parse patch syntax at line 2");
    });

    test("patch syntax with # comments should be skipped", () => {
        let patchSyntax = [
            '= /version => "1.0.1"',
            '# This is a comment',
            '+ /author => "Test"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        expect(operation.length).toEqual(2);
        expect(operation[0].op).toEqual("replace");
        expect(operation[1].op).toEqual("add");
    });

    test("patch syntax with // comments should be skipped", () => {
        let patchSyntax = [
            '= /version => "1.0.1"',
            '// This is also a comment',
            '+ /author => "Test"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        expect(operation.length).toEqual(2);
        expect(operation[0].op).toEqual("replace");
        expect(operation[1].op).toEqual("add");
    });

    test("patch syntax with mixed comments and operations", () => {
        let patchSyntax = [
            '# Update version',
            '= /version => "1.0.1"',
            '',
            '// Add new author',
            '+ /author => "Test"',
            '# Remove bugs section',
            '- /bugs'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        expect(operation.length).toEqual(3);
        expect(operation[0].op).toEqual("replace");
        expect(operation[1].op).toEqual("add");
        expect(operation[2].op).toEqual("remove");
    });

    test("patch syntax with empty lines should be skipped", () => {
        let patchSyntax = [
            '= /version => "1.0.1"',
            '',  // empty line should be allowed
            '+ /author => "Test"',
            '   ',  // whitespace-only line should be allowed
            '- /bugs'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        expect(operation.length).toEqual(3);
        expect(operation[0].op).toEqual("replace");
        expect(operation[1].op).toEqual("add");
        expect(operation[2].op).toEqual("remove");
    });

    test("patch syntax with missing operator should throw error", () => {
        let patchSyntax = [
            '= /version => "1.0.1"',
            '/author => "Test"',  // Missing operator
        ];

        expect(() => {
            patcher.parsePatchSyntax(patchSyntax.join("\n"));
        }).toThrow("Unable to parse patch syntax at line 2");
    });

    test("patch syntax with missing value for add operation should throw error", () => {
        let patchSyntax = [
            '+ /version',  // Missing => value part
        ];

        expect(() => {
            patcher.parsePatchSyntax(patchSyntax.join("\n"));
        }).toThrow("Failed to parse value");
    });

    test("preserve JSON formatting with tab indentation", () => {
        // Create JSON with tab indentation
        const formattedJson = JSON.stringify(inputJson, null, "\t");
        fs.writeFileSync("temp/tab-formatted.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "2.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/tab-formatted.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output uses tab indentation
        expect(response).toContain('\n\t"version"');
        expect(response).toContain('\n\t"keywords"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("2.0.0");
    });

    test("preserve JSON formatting with CRLF line endings", () => {
        // Create JSON with CRLF line endings
        const formattedJson = JSON.stringify(inputJson, null, 2).replace(/\n/g, "\r\n");
        fs.writeFileSync("temp/crlf-formatted.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "3.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/crlf-formatted.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output uses CRLF line endings
        expect(response).toContain("\r\n");
        expect(response.split("\r\n").length).toBeGreaterThan(1);

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("3.0.0");
    });

    test("preserve JSON formatting for array at root level", () => {
        const arrayJson = [
            { "id": 1, "name": "item1" },
            { "id": 2, "name": "item2" }
        ];

        // Create JSON array with 4-space indentation
        const formattedJson = JSON.stringify(arrayJson, null, 4);
        fs.writeFileSync("temp/array-formatted.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /0/name => "updated-item1"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/array-formatted.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output uses 4-space indentation
        expect(response).toContain('\n    {');
        expect(response).toContain('\n        "id"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result[0].name).toEqual("updated-item1");
    });

    test("preserve JSON formatting with tabs and CRLF combined", () => {
        // Create JSON with tab indentation and CRLF line endings
        const formattedJson = JSON.stringify(inputJson, null, "\t").replace(/\n/g, "\r\n");
        fs.writeFileSync("temp/tab-crlf-formatted.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "4.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/tab-crlf-formatted.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output uses both tab indentation and CRLF
        expect(response).toContain("\r\n");
        expect(response).toContain('\t"version"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("4.0.0");
    });

    test("handle minified JSON with no formatting", () => {
        // Create minified JSON (no spaces or newlines)
        const minifiedJson = JSON.stringify(inputJson);
        fs.writeFileSync("temp/minified.json", minifiedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "5.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/minified.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Minified JSON should get default 2-space formatting
        expect(response).toContain('\n  "version"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("5.0.0");
    });

    test("patchAsync should return true when files are patched", async () => {
        let patchSyntax = [
            '= /version => "6.0.0"'
        ];

        let result = await patcher.patchAsync(
            "temp/*.json",
            patchSyntax.join("\n"),
            false,
            false,
            false
        );

        expect(result).toBe(true);
    });

    test("patchAsync should return false when no files match pattern", async () => {
        let patchSyntax = [
            '= /version => "7.0.0"'
        ];

        let result = await patcher.patchAsync(
            "temp/*.nonexistent",
            patchSyntax.join("\n"),
            false,
            false,  // Don't fail if no files patched
            false   // Don't fail if error
        );

        expect(result).toBe(false);
    });

    test("README example: create nested object with repository/url", () => {
        // Test the exact example from README
        let patchSyntax = [
            '= /version => "1.2.3"',
            '+ /buildNumber => 42',
            '+ /repository => {}',
            '+ /repository/url => "https://github.com/owner/repo"'
        ];

        // Start with minimal package.json
        let minimalJson = {
            "version": "1.0.0",
            "name": "my-package"
        };

        fs.writeFileSync("temp/readme-example.json", JSON.stringify(minimalJson));

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/readme-example.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        // Verify all changes from README example
        expect(result.version).toEqual("1.2.3");
        expect(result.name).toEqual("my-package");
        expect(result.buildNumber).toEqual(42);
        expect(result.repository).toBeDefined();
        expect(result.repository.url).toEqual("https://github.com/owner/repo");
    });

    test("should fail when using = (replace) on non-existent nested path", () => {
        // Demonstrate why using = /repository/url fails when /repository doesn't exist
        let patchSyntax = [
            '= /version => "1.2.3"',
            '+ /buildNumber => 42',
            '= /repository/url => "https://github.com/owner/repo"'  // This will fail - /repository doesn't exist
        ];

        // Start with minimal package.json (no repository field)
        let minimalJson = {
            "version": "1.0.0",
            "name": "my-package"
        };

        fs.writeFileSync("temp/replace-fail.json", JSON.stringify(minimalJson));

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/replace-fail.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();

        // This should throw an error because /repository doesn't exist
        expect(() => {
            jp.apply(fileContent.content, operation);
        }).toThrow();
    });

    test("= (replace) can only update existing fields, not add new ones", () => {
        // Demonstrate that = only works to replace existing values, even with parent present
        // For adding new fields, always use +
        let minimalJson = {
            "version": "1.0.0",
            "name": "my-package",
            "repository": {
                "url": "https://github.com/old/repo"  // Existing field
            }
        };

        fs.writeFileSync("temp/replace-existing.json", JSON.stringify(minimalJson));

        // Test 1: Replace existing nested field works
        let patchSyntax1 = [
            '= /repository/url => "https://github.com/new/repo"'  // This works - field exists
        ];

        let operation1 = patcher.parsePatchSyntax(patchSyntax1.join("\n"));
        let fileContent1 = bom.removeBom(fs.readFileSync("temp/replace-existing.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response1 = jp.apply(fileContent1.content, operation1);
        let result1 = JSON.parse(response1);

        expect(result1.repository.url).toEqual("https://github.com/new/repo");

        // Test 2: Replace non-existent nested field fails
        let patchSyntax2 = [
            '= /repository/type => "github"'  // This fails - field doesn't exist
        ];

        let operation2 = patcher.parsePatchSyntax(patchSyntax2.join("\n"));
        let fileContent2 = bom.removeBom(fs.readFileSync("temp/replace-existing.json", { encoding: "utf8" }));

        // This should throw because the field doesn't exist
        expect(() => {
            jp.apply(fileContent2.content, operation2);
        }).toThrow();
    });

    test("README example: add keywords using array indices", () => {
        // Test the exact array syntax from README
        let patchSyntax = [
            '+ /keywords/0 => "github-actions"',
            '+ /keywords/1 => "automation"',
            '+ /keywords/2 => "ci-cd"'
        ];

        // Start with package.json that has empty keywords array
        let packageJson = {
            "version": "1.0.0",
            "name": "my-package",
            "keywords": []
        };

        fs.writeFileSync("temp/array-example.json", JSON.stringify(packageJson));

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/array-example.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        // Verify all keywords were added in order
        expect(result.keywords).toEqual(["github-actions", "automation", "ci-cd"]);
        expect(result.keywords.length).toEqual(3);
    });

    test("patchAsync should handle uppercase JSON extensions", async () => {
        // Create JSON files with uppercase extensions
        fs.writeFileSync("temp/CONFIG.JSON", JSON.stringify(inputJson));

        let patchSyntax = [
            '= /version => "3.0.0"'
        ];

        let result = await patcher.patchAsync(
            "temp/*.JSON",
            patchSyntax.join("\n"),
            false,
            false,
            false
        );

        expect(result).toBe(true);

        // Verify file was patched
        let configContent = JSON.parse(fs.readFileSync("temp/CONFIG.JSON", { encoding: "utf8" }));
        expect(configContent.version).toEqual("3.0.0");
    });
});
