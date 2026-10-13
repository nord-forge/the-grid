---
title: Package releases
description: CI validation and versioned npm publishing for maintainers.
---

GitHub CI checks the library types, unit and docs tests, package/style guards, docs build, and isolated Chromium, Firefox, and WebKit demos on every push to `main` and pull request. Browser screenshots and results are attached to the workflow run.

## First publication

Use browser authentication with an account that can publish under the `nord-forge` npm scope:

```sh
npm login --auth-type=web
npm run check:ci
npm run release:check
npm publish --access public
```

The package builds ESM JavaScript, type declarations, and the default stylesheet. Local `npm publish` runs the prepublish checks and package build. A prebuilt tarball can also be published after the same checks pass.

## Automated subsequent releases

In the npm package's **Trusted Publisher** settings, configure GitHub Actions with organization **nord-forge**, repository **the-grid**, workflow **release.yml**, and no environment name. This setup uses npm OIDC instead of a stored publishing token. See [npm's trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

Update the version in `package.json` and both root entries in `package-lock.json`, add a matching changelog section, and push the checked release commit. Tag that commit `vVERSION` and publish a GitHub release. The release workflow checks the exact tagged commit and all version metadata, runs the package/docs/browser checks, then publishes with provenance.

For a failed publish, manually dispatch `release.yml` with the existing version tag. A version already accepted by npm cannot be republished. Keep the first manual publication separate from subsequent automated releases.
