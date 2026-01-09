## Deployment and Releases

### Deploying a Branch

To deploy a source branch to a target branch (e.g., for staging/production deployments):

```bash
pnpm run deploy <src-branch> <target-branch> <message>
```

Example:
```bash
pnpm run deploy feature/my-feature deploy/staging "Deploying feature for testing"
```

This will:
- Create a tag with format: `d-<target-branch>-<timestamp>-<8-char-commit-hash>-<bip39-mnemonic>`
- Force-push the source branch to the target branch
- Push the tag to origin

### Creating a Release

To create a release from the main branch:

```bash
pnpm run release <message>
```

Example:
```bash
pnpm run release "Version 1.0.0 - Initial release"
```

This will:
- Create a release tag with format: `r-<timestamp>-<8-char-commit-hash>-<bip39-mnemonic>`
- Tag the current main branch
- Push the tag to origin

### Downloading Releases

Releases can be downloaded from restricted environments that allow source downloads but not git cloning:

1. Navigate to your git hosting provider's releases/tags page
2. Find the release tag (format: `r-<timestamp>-<hash>-<mnemonic>`)
3. Download the source archive (usually available as a .zip or .tar.gz file)
4. Extract and use the source code

The BIP39 mnemonic in the tag name provides a human-readable identifier for the release, making it easier to reference in documentation or conversations.

