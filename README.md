# Patch files

A simple action to patch JSON files.

> Only JSON files are supported at the moment. Support for other file types is planned in the later versions.

# Inputs

- `files`
   
   Glob expression. See example action YAML below. *Required.*

- `patch-syntax` 
    
    Use the `operation syntax => value` syntax to patch the JSON file. *Required.* 

    Supported Operations:
    - `+` add. Example:  `+ /version => "1.0.0"`
    - `-` remove. Example: `- /version` **Note:** No value is passed.
    - `=` replace. Example: `-/version => "1.0.1"`

    **Example**:
    
    Input JSON:
    ```json
    {
        "version": "1.0.0",
        "keywords": [],
        "author": "onlyutkarsh",
        "bugs": {
            "url": "http://www.dummy.com"
        }
    }
    ```
    Patch Syntax:
    ```yaml
    patch-syntax: |
          = /version => "1.0.1"
          + /author => "John Smith"
          = /bugs/url => "https://www.mydomain.com"
    ```
    Output JSON:
    ```json
    {
        "version": "1.0.1",
        "keywords": [],
        "author": "John Smith",
        "bugs": {
            "url": "https://www.mydomain.com"
        }
    }
    ```
- `output-patched-file`

    If `true`, the patched content is printed in the logs. *Optional. Default is `true`*. 

- `fail-if-no-files-patched`

    If `true`, fails the build, if no files are patched. *Optional. Default is `false`*. 

- `fail-if-error`

    If `true`, failes the build when an error occurrs. *Optional. Default is `false`* 

# Sample action

```yaml

name: "test action"
on:
  pull_request:
  push:
    branches:
      - master
      - 'feature/*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1

    - name: Patch files
      uses: onlyutkarsh/patch-files-action@v1.0.0
      env:
        name: utkarsh
      with:
        files: |
          testfiles/**/*.json
        patch-syntax: |
          = /version => "1.0.1"
          + /author => "${{ env.name }}"
          = /bugs/url => "https://www.google.com"
          + /buildId => "${{ github.run_number }}"

```

# Acknowledgment

- Inspired from https://marketplace.visualstudio.com/items?itemName=geeklearningio.gl-vsts-tasks-file-patch task for Azure Pipelines
