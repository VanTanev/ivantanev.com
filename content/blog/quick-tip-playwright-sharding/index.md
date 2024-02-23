---
title: "Quick Tip: Simpler sharding configuration for Playwright"
date: "2024-02-25T10:00:00+02:00"
description: "The cannonical way of sharding, presented in the playwright documentation, is a little messy. We can do better!"
published: false
tags: ["GitHub Actions", "Playwright", "CI"]
---

Playwright's [sharding docs](https://playwright.dev/docs/test-sharding) present the following [GitHub actions configuration](https://playwright.dev/docs/test-sharding#github-actions-example):

```yaml
strategy:
  fail-fast: false
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]
[...]
steps:
- name: Run Playwright tests
  run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

While it works, I think the following reads much better:

```yaml
strategy:
  fail-fast: false
  matrix:
    shard: ["1/4", "2/4", "3/4", "4/4"]
[...]
steps:
- name: Run Playwright tests
  run: npx playwright test --shard=${{ matrix.shard }}
```

What do you think?
