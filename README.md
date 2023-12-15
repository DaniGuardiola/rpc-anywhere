# My package template

This is my personal npm package template. It uses the latest and greatest tools while keeping things simple.

Here's what's included:

- [Bun](https://bun.sh/): fast package manager and task runner.
- [TypeScript](https://www.typescriptlang.org/): typed JavaScript.
- [tshy](https://github.com/isaacs/tshy/): package builder. It Just Works™️ for ESM + CommonJS exports.
- [Changesets](https://github.com/changesets/changesets): versioning, changelogs and releases.
  - Includes a GitHub Action that automates changelogs and releases.
- [ESLint](https://eslint.org/): linting.
  - Using the recommended rules from [`eslint`](https://eslint.org/docs/latest/rules/) and [`@typescript-eslint`](https://typescript-eslint.io/rules/?=recommended) + deterministic import sort.
- [Prettier](https://prettier.io/): code formatting.
- Bug and feature request forms for GitHub issues.
- Automatic pull request CI checks: types, format, and linting.

## Usage

The easiest way to use this template is by using `bun create`:

```
bun create DaniGuardiola/package-template my-package
```

You can also use the "Use this template" button on GitHub.

Once initialized, make sure to follow these steps:

- [ ] Update the name, description and author in the `package.json` file.
- [ ] Update the heading of the `CHANGELOG.md` file.
- [ ] Replace the author in the `LICENSE` file.
- [ ] Replace this README's content with your own.
- [ ] Publish to GitHub.
- [ ] Register the `NPM_TOKEN` secret for GitHub actions.

  This is required to publish the package to npm from the `publish.yml` workflow.

  1. Go to `https://www.npmjs.com/settings/<your username>/tokens`.
  2. Generate a new access token that has read and write permissions for, at the very least, your new package.
  3. Copy the token and go to your GitHub repository.
  4. Go to Settings > Secrets and variables > Actions.
  5. Create a new repository secret called `NPM_TOKEN` and paste the token as its value.

- [ ] Enable the right permissions for the `GITHUB_TOKEN` secret:

  This is required for Changesets to create and update pull requests for versioning from the `publish.yml` workflow.

  1. In your GitHub repository, go to Settings > Actions > General.
  2. Scroll down to "Workflow permissions".
  3. Select the "Read and write permissions".
  4. Enable "Allow GitHub Actions to create and approve pull requests".

- [ ] Create a great package and publish it to npm! 🚀

## Releases

This template uses [Changesets](https://github.com/changesets/changesets) to manage releases. Check out their documentation to learn how to use it. The basic idea is:

1. Make changes.
2. Run `bun changeset` to create a new changeset.
3. Commit and push the changeset (either directly to `main` or by merging a pull request).
4. A PR titled "Version Packages" will be created (or updated) by the `publish.yml` workflow.
5. Merge the PR when you're ready to publish a new version.
6. The `publish.yml` workflow will publish the new version to npm.

## Recommendations

This is a list of settings and other things that I usually do in my packages. They are not mandatory though!

- General settings

  - [ ] Enable "Always suggest updating pull request branches".
  - [ ] Enable "Allow auto-merge".
  - [ ] Enable "Automatically delete head branches".
  - [ ] From "Allow merge commits/squash merging/rebase merging" leave only "Allow squash merging" enabled.
  - [ ] In the same setting, select "Default to pull request title".

- Main branch protection

  In your GitHub repository, go to Settings > Branches and click "Add rule".

  - [ ] In "Branch name pattern", type "main".
  - [ ] Enable "Require a pull request before merging".
  - [ ] Enable "Require approvals".
  - [ ] Enable "Require approval of the most recent reviewable push".
  - [ ] Enable "Require status checks to pass before merging".
  - [ ] Enable "Require branches to be up to date before merging".
  - [ ] Add the following status checks as required: `check-format`, `check-types`, `lint`.
  - [ ] Enable "Lock branch".

  Finally, click "Create".

## Contributing

Contributions are welcome, but I will need to agree to significant changes since this is, after all, my personal template. Feel free to open an issue to discuss it.
