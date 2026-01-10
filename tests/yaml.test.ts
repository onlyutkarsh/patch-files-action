import fs from "fs";
import * as patcher from "../src/patcher";
import {YamlPatcher} from "../src/YamlPatcher";
import * as bom from "../src/bom";
import * as yaml from "js-yaml";

let inputYaml = {
  version: "1.0.0",
  keywords: [],
  author: "onlyutkarsh",
  bugs: {
    url: "http://www.dummy.com",
  },
};

describe("YamlPatcher tests", () => {
  beforeEach(async () => {
    fs.mkdirSync("temp");

    fs.writeFileSync("temp/test.yaml", yaml.dump(inputYaml));
    fs.writeFileSync("temp/test.yml", yaml.dump(inputYaml));
  });

  afterEach(async () => {
    fs.rmSync("temp", {recursive: true, force: true});

    jest.restoreAllMocks();
  });

  test("parse patch syntax and apply to YAML file", () => {
    const patchSyntax = [
      '= /version => "1.0.1"',
      '= /author => "Utkarsh Shigihalli"',
      '+ /bugs/name => "Google"',
      '= /bugs/url => "https://www.google.com"',
    ];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);

    const expectedResponse = {
      version: "1.0.1",
      keywords: [],
      author: "Utkarsh Shigihalli",
      bugs: {
        url: "https://www.google.com",
        name: "Google",
      },
    };

    // Parse the YAML output and compare structure
    expect(yaml.load(response)).toEqual(expectedResponse);
  });

  test("add multiple elements to YAML file", () => {
    const patchSyntax = [
      '+ /license => "MIT"',
      '+ /repository => "https://github.com/test/repo"',
      '+ /bugs/email => "bugs@example.com"',
    ];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.license).toEqual("MIT");
    expect(result.repository).toEqual("https://github.com/test/repo");
    expect(result.bugs.email).toEqual("bugs@example.com");
  });

  test("replace multiple values in YAML file", () => {
    const patchSyntax = [
      '= /version => "2.0.0"',
      '= /author => "Jane Doe"',
      '= /bugs/url => "https://newurl.com"',
    ];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.version).toEqual("2.0.0");
    expect(result.author).toEqual("Jane Doe");
    expect(result.bugs.url).toEqual("https://newurl.com");
  });

  test("remove single field in YAML file", () => {
    const patchSyntax = ["- /author"];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.author).toBeUndefined();
    expect(result.version).toEqual("1.0.0"); // other fields should remain
  });

  test("remove multiple fields in YAML file", () => {
    const patchSyntax = ["- /keywords", "- /bugs/url"];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.keywords).toBeUndefined();
    expect(result.bugs.url).toBeUndefined();
    expect(result.version).toEqual("1.0.0"); // other fields should remain
  });

  test("handle array patching - add to array in YAML", () => {
    const patchSyntax = [
      '+ /keywords/0 => "testing"',
      '+ /keywords/1 => "github-actions"',
    ];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.keywords).toContain("testing");
    expect(result.keywords).toContain("github-actions");
    expect(result.keywords.length).toEqual(2);
  });

  test("handle numeric values in YAML", () => {
    const patchSyntax = ["+ /downloads => 1000", "+ /rating => 4.5"];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.downloads).toEqual(1000);
    expect(result.rating).toEqual(4.5);
  });

  test("handle boolean values in YAML", () => {
    const patchSyntax = ["+ /private => true", "+ /deprecated => false"];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.private).toEqual(true);
    expect(result.deprecated).toEqual(false);
  });

  test("handle null values in YAML", () => {
    const patchSyntax = ["+ /homepage => null"];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.homepage).toBeNull();
  });

  test("handle object values in YAML", () => {
    const patchSyntax = ['+ /config => {"timeout": 30, "retries": 3}'];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.config).toEqual({timeout: 30, retries: 3});
  });

  test("handle array values in YAML", () => {
    const patchSyntax = ['= /keywords => ["test", "ci", "automation"]'];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.keywords).toEqual(["test", "ci", "automation"]);
  });

  test("handle deep nested paths in YAML", () => {
    const patchSyntax = [
      "+ /bugs/contact => {}",
      '+ /bugs/contact/email => "support@example.com"',
      '+ /bugs/contact/phone => "+1234567890"',
    ];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.bugs.contact.email).toEqual("support@example.com");
    expect(result.bugs.contact.phone).toEqual("+1234567890");
  });

  test("handle BOM preservation in YAML", () => {
    const contentWithBOM = "\uFEFF" + yaml.dump(inputYaml);
    fs.writeFileSync("temp/bom-test.yaml", contentWithBOM, {encoding: "utf8"});

    const patchSyntax = ['= /version => "2.0.0"'];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/bom-test.yaml", {encoding: "utf8"})
    );

    expect(fileContent.hadBOM).toBe(true);

    const yp = new YamlPatcher();
    fileContent.content = yp.apply(fileContent.content, operation);

    const restoredContent = bom.restoreBom(fileContent);
    expect(restoredContent).toMatch(/^\uFEFF/);
  });

  test("mixed operations in YAML - add, replace, remove", () => {
    const patchSyntax = [
      '= /version => "3.0.0"',
      '+ /license => "Apache-2.0"',
      "- /keywords",
      '= /bugs/url => "https://issues.example.com"',
      '+ /bugs/type => "github"',
    ];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.version).toEqual("3.0.0");
    expect(result.license).toEqual("Apache-2.0");
    expect(result.keywords).toBeUndefined();
    expect(result.bugs.url).toEqual("https://issues.example.com");
    expect(result.bugs.type).toEqual("github");
  });

  test("preserve YAML formatting with CRLF line endings", () => {
    // Create YAML with CRLF line endings
    const formattedYaml = yaml.dump(inputYaml).replace(/\n/g, "\r\n");
    fs.writeFileSync("temp/crlf-formatted.yaml", formattedYaml, {
      encoding: "utf8",
    });

    const patchSyntax = ['= /version => "3.0.0"'];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/crlf-formatted.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);

    // Verify the output uses CRLF line endings
    expect(response).toContain("\r\n");
    expect(response.split("\r\n").length).toBeGreaterThan(1);

    // Verify content is correct
    const result = yaml.load(response) as any;
    expect(result.version).toEqual("3.0.0");
  });

  test("work with .yml file extension", () => {
    const patchSyntax = ['= /version => "2.0.0"'];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/test.yml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.version).toEqual("2.0.0");
  });

  test("handle YAML with comments", () => {
    const yamlWithComments = `# This is a comment
version: "1.0.0"
keywords: []
# Author information
author: onlyutkarsh
bugs:
  url: http://www.dummy.com
`;

    fs.writeFileSync("temp/commented.yaml", yamlWithComments, {
      encoding: "utf8",
    });

    const patchSyntax = ['= /version => "2.0.0"'];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/commented.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result.version).toEqual("2.0.0");
    // Note: js-yaml doesn't preserve comments, which is expected behavior
  });

  test("handle YAML array at root level", () => {
    const arrayYaml = [
      {id: 1, name: "item1"},
      {id: 2, name: "item2"},
    ];

    fs.writeFileSync("temp/array.yaml", yaml.dump(arrayYaml), {
      encoding: "utf8",
    });

    const patchSyntax = ['= /0/name => "updated-item1"'];

    const operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
    const fileContent = bom.removeBom(
      fs.readFileSync("temp/array.yaml", {encoding: "utf8"})
    );

    const yp = new YamlPatcher();
    const response = yp.apply(fileContent.content, operation);
    const result = yaml.load(response) as any;

    expect(result[0].name).toEqual("updated-item1");
    expect(result[1].name).toEqual("item2");
  });

  test("patchAsync should handle uppercase YAML extensions", async () => {
    // Create YAML files with uppercase extensions
    fs.writeFileSync("temp/CONFIG.YAML", yaml.dump(inputYaml), {
      encoding: "utf8",
    });
    fs.writeFileSync("temp/values.YML", yaml.dump(inputYaml), {
      encoding: "utf8",
    });

    const patchSyntax = ['= /version => "2.0.0"'];

    const result = await patcher.patchAsync(
      "temp/*.YAML\ntemp/*.YML",
      patchSyntax.join("\n"),
      false,
      false,
      false
    );

    expect(result).toBe(true);

    // Verify both files were patched
    const configContent = yaml.load(
      fs.readFileSync("temp/CONFIG.YAML", {encoding: "utf8"})
    ) as any;
    const valuesContent = yaml.load(
      fs.readFileSync("temp/values.YML", {encoding: "utf8"})
    ) as any;

    expect(configContent.version).toEqual("2.0.0");
    expect(valuesContent.version).toEqual("2.0.0");
  });
});
