---
title: Safer Node.js coding with git hooks and husky
date: "2021-09-28T00:00:00+02:00"
description: Practical examples for setting up git hooks with husky for safer Node.js development
---

## Our goals

1. Auto-format source code before each commit
2. Fast local tests before each commit
3. Auto-install npm dependencies when switching branches

## The base: Git hooks with Husky

[Husky](https://typicode.github.io/husky/) is a thin wrapper around [git hooks](https://git-scm.com/docs/githooks) - shell scripts that execute in response to git actions.
Husky configures git to use the `.husky` folder for reading hooks.

Setup is straightforward, install husky

```shell
➜  npm install husky is-ci --save-dev
➜  npx husky install
```

and setup the `husky install` command to run automatically outside of CI environments

```json
// package.json
{
  "scripts": {
    "prepare": "is-ci || husky install"
  }
}
```

And finally, add a test `pre-commit` hook:

```shell
➜  npx husky add .husky/pre-commit 'echo "the pre-commit hook ran 🚀"'
```

This will put our script in the `.husky` directory:

```shell
➜  test-repo git:(master) ✗ tree .husky
.husky
├── _
│   └── husky.sh
└── pre-commit
```

`.husky/pre-commit`:

```bash
#!/bin/sh

. "$(dirname "$0")/_/husky.sh"

echo "the pre-commit hook ran 🚀"
```

And we can test that our hook executes when we commit:

```shell
➜  git add .husky && git commit -m 'add husky'
the pre-commit hook ran 🚀
 ....
```

## 1. Auto-format source code before each commit

Using [prettier](https://prettier.io) and [pretty-quick](https://www.npmjs.com/package/pretty-quick) auto-formatting code is as simple as:

```shell
➜  npm install prettier pretty-quick --save-dev
```

Update `.husky/pre-commit`:

```bash
#!/bin/sh

. "$(dirname "$0")/_/husky.sh"

npx pretty-quick --staged # ✅ replace the dummy "echo" command
```

And we're done, now our files will be auto-formatted by `prettier` before each commit!

```shell
➜  git add . && git commit -m 'add pretty-quick'
🔍  Finding changed files since git revision ff5738c.
🎯  Found 2 changed files.
✍️  Fixing up package.json.
✅  Everything is awesome!
 ....
```

## 2. Fast local tests before each commit

We will use [lint-staged](https://github.com/okonet/lint-staged) to execute minimal local tests before each commit.

The following setup will only execute tests related to the files that have actually been changed in the current commit instead of your full test suite.
We can leave the full test suite execution to our CI.

```shell
➜  npm install lint-staged jest --save-dev
```

Update `.husky/pre-commit`:

```bash
#!/bin/sh

. "$(dirname "$0")/_/husky.sh"

npx pretty-quick --staged
npx lint-staged # ✅ add lint-staged
```

Add `.lintstagedrc.js`

```js
// .lintstagedrc.js
module.exports = {
  // If any ts/js(x) files changed.
  "**/*.{ts,js}?x": [
    // Execute tests related to the staged files.
    "npm run test -- --passWithNoTests --bail --findRelatedTests",

    // Run the typechecker.
    // Anonymous function means: "Do not pass args to the command."
    () => "tsc --noEmit",
  ],
}
```

# 3. Auto-install npm dependencies when switching branches

A great way to lose time chasing non-existent bugs is to forget that different branches can have different dependencies in `package.json`.
The following setup will automatically run `npm install` after you switch branches or execute git commands that can modify `package.json`, e.g. a merge.

```shell
➜  npx husky add .husky/post-checkout 'echo "the post-checkout hook ran 🚀"'
```

Update `.husky/post-checkout`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# From the post-checkout docs https://git-scm.com/docs/githooks#_post_checkout
# The hook is given three parameters:
#  - the ref of the previous HEAD
#  - the ref of the new HEAD (which may or may not have changed)
#  - a flag indicating whether the checkout was:
#     - a branch checkout (changing branches, flag=1)
#     - a file checkout (retrieving a file from the index, flag=0).

# When the third script parameter is "1" we are executing a branch checkout
if [ "$3" = "1" ]; then
  # install npm packages
  npm install

  # or with yarn
  # yarn install --frozen-lockfile
fi
```

Additionally, we should run `npm install` after a merge or a rewrite.
We can setup those up with just 2 commands:

```shell
➜  npx husky add .husky/post-merge 'npm ci'
➜  npx husky add .husky/post-rewrite 'npm install'
```

Or with `yarn`:

```shell
➜  npx husky add .husky/post-merge 'rm -rf node_modules && yarn install --frozen-lockfile'
➜  npx husky add .husky/post-rewrite 'yarn install'
```
