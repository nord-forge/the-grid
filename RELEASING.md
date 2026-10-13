# Releases

CI runs type checks, unit and docs tests, package/style guards, the docs build, and isolated Chromium, Firefox, and WebKit checks on pushes and pull requests. Browser evidence is attached to the run.

## First npm publication

1. Sign in with `npm login` using an account with permission to publish under the `nord-forge` scope. If the npm organization does not exist yet, create it and grant publishing access first.
2. Run `npm run check:ci`, install the Playwright engines, start `npm run docs:preview`, and run `npm run docs:browser:all`.
3. Run `npm run release:check`, then `npm publish --access public`. The local prepublish hook checks the library and builds the distribution again.
4. In the package's npm **Trusted Publisher** settings, configure GitHub Actions with organization **nord-forge**, repository **the-grid**, workflow **release.yml**, and no environment name. This initial account-side setup is required before the workflow can publish without a token.

## Subsequent releases

1. Update `package.json` and both root version entries in `package-lock.json`, and add a matching version section to `CHANGELOG.md`.
2. Run the checks, commit the changes, and push to `main`. Wait for CI to pass.
3. Create the version tag (for example `v0.2.0`) on the release commit and publish a GitHub release with that tag.
4. The `Publish npm release` workflow checks that the tag, commit, manifest, lockfile, and changelog agree, runs the full checks, and publishes with npm OIDC and provenance. No npm token is stored in GitHub.

To rerun a failed publish, dispatch `release.yml` with the existing version number. Never reuse a version that npm already accepted. This release workflow accepts stable versions only and publishes to `latest`.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for the account-side setup and supported runners. Node 24 supplies an npm version compatible with trusted publishing.
