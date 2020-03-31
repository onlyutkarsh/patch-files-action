import { promises as fs } from "fs";
import * as process from "process";
import { patchFiles, findFilesInDir } from "../src/patchfiles";


describe("basic functionality", () => {
    beforeEach(async () => {
        await fs.rmdir("./temp", { recursive: true });

        await fs.writeFile("test.txt", "hello #{MY_TOKEN}#", "utf8");
        await fs.writeFile("test2.txt", "#{GREETING}# #{ACTOR}#", "utf8");

        await fs.mkdir("./temp");
        await fs.writeFile("./temp/test.json", "{\"version\":\"1.0.0\",\"keywords\":[],\"author\":\"onlyutkarsh\",\"bugs\":{\"url\":\"http://www.dummy.com\"}}");
    });

    afterEach(async () => {
        await fs.unlink("test.txt");
        await fs.unlink("test2.txt");
    });

    test("find matching files in a directory should return one file", async () => {
        let files = ["temp/*.json"];
        let paths = await findFilesInDir(files);
        expect(paths.length).toEqual(1);
    });

    test("add element to file", async () => {

    });

    test("add multiiple elements to file", async () => {

    });

    test("replace single token in file", async () => {
        let files = ["temp/*.json"];
        let patchSyntax = "= /version => \"1.0.1\"";
        let result = await patchFiles(files, patchSyntax);
        expect(result).toEqual(true);

    });

    test("replace multiple tokens in file", async () => {

    });

    test("remove single token in file", async () => {

    });

    test("remove multiple tokens in file", async () => {

    });

});