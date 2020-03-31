import { promises as fs } from "fs";
import * as process from "process";
import * as pf from "../src/patchfiles";


describe("basic functionality", () => {
    beforeEach(async () => {
        await fs.writeFile("test.txt", "hello #{MY_TOKEN}#", "utf8");
        await fs.mkdir("temp");
        await fs.writeFile("temp/test.json", "{\"version\":\"1.0.0\",\"keywords\":[],\"author\":\"onlyutkarsh\",\"bugs\":{\"url\":\"http://www.dummy.com\"}}");
    });

    afterEach(async () => {
        await fs.unlink("test.txt");
        await fs.rmdir("temp", { recursive: true });
    });

    test("find matching files in a directory should return one file", async () => {
        let pattern = ["temp/*.json"];
        let files = pattern.join("\n");
        let globber = await pf.globFiles(files);
        let paths = await globber.glob();
        expect(paths.length).toEqual(1);
    });

    test("add element to file", async () => {

    });

    test("add multiiple elements to file", async () => {

    });

    test("replace multiple tokens in file", async () => {
    });

    test("remove single token in file", async () => {

    });

    test("remove multiple tokens in file", async () => {

    });
});
