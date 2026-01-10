# Patch Files Action

A GitHub Action to patch JSON and YAML files using JSON Patch operations with a simple, intuitive syntax.

## Features

- 🎯 **Simple Syntax**: Easy-to-use patch syntax for quick file modifications
- 📝 **Multiple Formats**: Supports both JSON and YAML files
- 🔄 **Format Preservation**: Maintains original formatting (indentation, line endings, BOM)
- ⚡ **Glob Patterns**: Patch multiple files at once using glob patterns
- 🔍 **Built on Standards**: Uses JSON Patch (RFC 6902) under the hood

## Inputs

### `files` (required)

Glob pattern(s) to match files to patch. Supports multiple patterns (one per line).

**Examples:**
```yaml
files: |
  config/**/*.json
  settings/*.yaml
  **/*.yml
```

### `patch-syntax` (required)

Patch operations using the simple syntax: `<operation> <path> => <value>`

**Supported Operations:**
- `+` **add** - Add a new field or array element
- `-` **remove** - Remove a field or array element (no value needed)
- `=` **replace** - Replace an existing value

**Path Format:**
- Use JSON Pointer notation (RFC 6901)
- Must start with `/`
- Use `/` to separate nested fields
- Use `/0`, `/1`, etc. for array indices

**Examples:**
```yaml
patch-syntax: |
  # Add a new field
  + /version => "1.0.1"

  # Replace existing value
  = /author => "John Smith"

  # Add nested field
  + /bugs/email => "bugs@example.com"

  # Remove a field
  - /deprecated_field

  # Array operations
  + /keywords/0 => "github-actions"

  # Comments are supported with # or //
  // This is also a comment
```

### `output-patched-file` (optional)

If `true`, outputs the patched file content to the logs for verification. Default: `true`.

### `fail-if-no-files-patched` (optional)

If `true`, fails the workflow if no files match the pattern. Default: `false`.

### `fail-if-error` (optional)

If `true`, fails the workflow on any error. If `false`, shows warnings instead. Default: `false`.

## Usage Examples

### Basic JSON Patching

Patch a `package.json` file to update version and add metadata:

```yaml
- name: Update package.json
  uses: onlyutkarsh/patch-files-action@v1
  with:
    files: package.json
    patch-syntax: |
      = /version => "1.2.3"
      + /buildNumber => "${{ github.run_number }}"
      + /repository => {}
      + /repository/url => "https://github.com/${{ github.repository }}"
```

**Input:**
```json
{
  "version": "1.0.0",
  "name": "my-package"
}
```

**Output:**
```json
{
  "version": "1.2.3",
  "name": "my-package",
  "buildNumber": "42",
  "repository": {
    "url": "https://github.com/owner/repo"
  }
}
```

### YAML Configuration Files

Patch Kubernetes or CI/CD configuration files:

```yaml
- name: Update deployment config
  uses: onlyutkarsh/patch-files-action@v1
  with:
    files: |
      config/*.yaml
      .github/workflows/*.yml
    patch-syntax: |
      # Use full path from root: /spec/image/tag (not /image/tag)
      = /spec/image/tag => "${{ github.sha }}"
      = /spec/replicas => 3
      + /metadata/annotations => {}
      + /metadata/annotations/deployment-time => "${{ github.event.head_commit.timestamp }}"
```

**Input YAML:**
```yaml
apiVersion: v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  image:
    name: my-app
    tag: latest
```

**Output YAML:**
```yaml
apiVersion: v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    deployment-time: '2024-01-15T10:30:00Z'
spec:
  replicas: 3
  image:
    name: my-app
    tag: abc123def456
```

### Multiple Files with Glob Patterns

```yaml
- name: Update all config files
  uses: onlyutkarsh/patch-files-action@v1
  with:
    files: |
      **/config.json
      **/settings.yaml
    patch-syntax: |
      = /environment => "production"
      + /deployedBy => "${{ github.actor }}"
      + /deployedAt => "${{ github.event.head_commit.timestamp }}"
```

### Working with Arrays

```yaml
- name: Add keywords to package.json
  uses: onlyutkarsh/patch-files-action@v1
  with:
    files: package.json
    patch-syntax: |
      + /keywords/0 => "github-actions"
      + /keywords/1 => "automation"
      + /keywords/2 => "ci-cd"
```

### Complex Values (Objects and Arrays)

```yaml
- name: Add complex configuration
  uses: onlyutkarsh/patch-files-action@v1
  with:
    files: config.json
    patch-syntax: |
      # Add an object
      + /database => {"host": "localhost", "port": 5432}

      # Replace an array
      = /environments => ["dev", "staging", "prod"]

      # Add to nested object
      + /features/experimental => true
```

### Value Types

The action supports all JSON value types:

```yaml
patch-syntax: |
  # Strings (use quotes)
  + /name => "John Doe"

  # Numbers (no quotes)
  + /port => 8080
  + /version => 2.5

  # Booleans
  + /enabled => true
  + /debug => false

  # Null
  + /optional => null

  # Objects
  + /config => {"timeout": 30, "retries": 3}

  # Arrays
  + /tags => ["v1", "v2", "v3"]
```

### Using Environment Variables

```yaml
- name: Patch with environment variables
  uses: onlyutkarsh/patch-files-action@v1
  env:
    APP_VERSION: "2.0.0"
    BUILD_ENV: "production"
  with:
    files: config.json
    patch-syntax: |
      = /version => "${{ env.APP_VERSION }}"
      = /environment => "${{ env.BUILD_ENV }}"
      + /buildId => "${{ github.run_number }}"
      + /commit => "${{ github.sha }}"
```

### Full Workflow Example

```yaml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update version and build info
        uses: onlyutkarsh/patch-files-action@v1
        with:
          files: |
            package.json
            config/production.yaml
          patch-syntax: |
            # Update version from git tag or sha
            = /version => "${{ github.ref_name }}"

            # Add deployment metadata
            + /build/number => "${{ github.run_number }}"
            + /build/sha => "${{ github.sha }}"
            + /build/actor => "${{ github.actor }}"
            + /build/timestamp => "${{ github.event.head_commit.timestamp }}"

            # Update environment settings
            = /environment => "production"
            = /apiUrl => "https://api.example.com"

          output-patched-file: true
          fail-if-error: true

      - name: Commit changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "chore: update version and build info [skip ci]"
          git push
```

## Format Preservation

The action automatically preserves file formatting:

- **Indentation**: Detects and maintains spaces, tabs, and indentation levels
- **Line Endings**: Preserves LF (`\n`) or CRLF (`\r\n`)
- **BOM**: Preserves UTF-8 BOM if present
- **Key Order**: Maintains the original order of keys (YAML)

## Comments in Patch Syntax

You can add comments to document your patches:

```yaml
patch-syntax: |
  # Update application version
  = /version => "2.0.0"

  // Add build information
  + /buildId => "${{ github.run_number }}"

  # Remove deprecated fields
  - /oldField
```

Both `#` and `//` style comments are supported.

## Error Handling

When `fail-if-error: false`, errors are logged as warnings and the workflow continues. This is useful for optional patches:

```yaml
- name: Try to patch config (optional)
  uses: onlyutkarsh/patch-files-action@v1
  with:
    files: optional-config.json
    patch-syntax: |
      = /setting => "value"
    fail-if-error: false
    fail-if-no-files-patched: false
```

## JSON Patch Standard

Under the hood, this action uses JSON Patch (RFC 6902). The simple syntax is converted to standard JSON Patch operations:

| Simple Syntax | JSON Patch Operation |
|--------------|---------------------|
| `+ /path => value` | `{"op": "add", "path": "/path", "value": value}` |
| `- /path` | `{"op": "remove", "path": "/path"}` |
| `= /path => value` | `{"op": "replace", "path": "/path", "value": value}` |

## Troubleshooting

### Path must start with `/`

❌ Wrong: `= version => "1.0.0"`
✅ Correct: `= /version => "1.0.0"`

### Nested paths must include full hierarchy

Paths must follow the complete hierarchy from the document root.

❌ Wrong: `= /image/tag => "v1.2.3"` (when `image` is nested under `spec`)
✅ Correct: `= /spec/image/tag => "v1.2.3"`

**Example:**
```yaml
# Given this structure:
spec:
  replicas: 1
  image:
    tag: latest

# Use the full path from root:
= /spec/image/tag => "v1.2.3"

# NOT just /image/tag
```

### Invalid JSON value

❌ Wrong: `+ /name => John` (missing quotes for strings)
✅ Correct: `+ /name => "John"`

### Cannot add to non-existent path

If you try to add `/parent/child` but `/parent` doesn't exist, first create the parent:

```yaml
patch-syntax: |
  + /parent => {}
  + /parent/child => "value"
```

## Acknowledgments

- Inspired by [File Patch Task](https://marketplace.visualstudio.com/items?itemName=geeklearningio.gl-vsts-tasks-file-patch) for Azure Pipelines
- Built with [fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch) and [js-yaml](https://github.com/nodeca/js-yaml)

## License

MIT
