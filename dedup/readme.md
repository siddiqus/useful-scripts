### Check Code Duplication

This process can be used to generate a TypeScript code duplication report using `jscpd`, and comment the report in a github PR

##### Example script command in package.json
`"dupecheck": "node scripts/dupe-check.js"`

#### Example github action
```
name: PR Test

on: ['pull_request']

jobs:
  tests:
    name: Unit Testing
    runs-on: ubuntu-20.04
    steps:
      - name: Checkout base branch
        uses: actions/checkout@v3
        with:
          ref: ${{github.base_ref}}
      - name: Checkout current branch
        uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.13.0'
          cache: 'yarn'

      - name: Install dependencies & Run Test cases
        id: run_tests
        env:
          NODE_ENV: test
        run: |-
          yarn install --frozen-lockfile
          mkdir -p reports/
          yarn dupcheck baseRef="${{github.base_ref}}"

      - name: Comment Duplicate Check
        uses: machine-learning-apps/pr-comment@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          path: reports/dupcheck.md

```


#### Sample github comment
> Duplications detection: Found 11 exact clones with 102(2.24%) duplicated lines in 13 (1 formats) files.

| Format     | Files analyzed | Total lines | Total tokens | Clones found | Duplicated lines | Duplicated tokens |
| ---------- | -------------- | ----------- | ------------ | ------------ | ---------------- | ----------------- |
| typescript | 13             | 4554        | 31982        | 11           | 102 (2.24%)      | 728 (2.28%)       |
| **Total:** | **13**         | **4554**    | **31982**    | **11**       | **102 (2.24%)**  | **728 (2.28%)**   |



