# Contributing

Thanks for your interest in for-ca!

## Issues

- Report bugs or suggest features via [GitHub Issues](https://github.com/bo-wu-feng-199/for-ca/issues).
- Include the currency, input values, expected vs actual output, and your Node.js version for bug reports.

## Pull Requests

1. Fork and clone the repo.
2. Run `npm install` and `npm test` to verify the baseline.
3. Create a branch: `git checkout -b my-feature`.
4. Make changes. Keep the core package (`for-ca/packages/core`) zero-dependency.
5. Add or update tests. Run `npm test` — all must pass.
6. Open a PR against `main`.

## Code Style

- ES modules (`import`/`export`).
- No transpilers. No TypeScript compilation (types are hand-written `.d.ts`).
- Functions are pure: same input → deterministic output.
- Integer arithmetic for currency values.

## Release Process

Maintainers run:

```bash
npm test
npm version patch  # or minor / major
npm publish
git push --tags
```

The package lives at `for-ca/packages/core`.
