---
title: Make Your Jest Tests up to 20% Faster by Changing a Single Setting
date: "2021-03-21T10:25:48+02:00"
description: Optimize the Jest worker count for faster test execution
published: true
---

## TL;DR

When you have `Jest` as your `test` command, pass the `--maxWorkers=50%` option to make the tests run faster.
For watch mode, use `--maxWorkers=25%`, and for CI disable Jest workers with `--runInBand`.
You can experiment with the percentage and fine-tune for your particular setup.

```json
// package.json
{
  "scripts": {
    // standalone Jest
    "test": "jest --watchAll=false --maxWorkers=50%",
    "test:watch": "jest --maxWorkers=25%",
    "test:ci": "jest --watchAll=false --runInBand",

    // or with Create React App
    "test": "react-scripts test --watchAll=false --maxWorkers=50%",
    "test:watch": "react-scripts test --maxWorkers=25%",
    "test:ci": "react-scripts test --watchAll=false --runInBand"
  }
}
```

## How Jest selects how many workers to use

The [Jest test runner](https://github.com/facebook/jest)--that is also supplied by default with [Create React App](https://reactjs.org/docs/create-a-new-react-app.html)--does not run optimally out of the box.

By default, [Jest will run on all available CPU threads](https://github.com/facebook/jest/blob/2d965261493febb8e6c679965010f29ea8c9316a/packages/jest-config/src/getMaxWorkers.ts#L23-L32), using one thread for the cli process and the rest for test workers.
When in watch mode, it will use half the available CPU threads.

This however results in sub-optimal performance on all systems I tested on.

## Measuring Jest performance with and without --maxWorkers=50%

These are the stats for the testsuite used. It's a React app with mostly unit tests:

```bash
Test Suites: 43 passed, 43 total
Tests:       1 skipped, 258 passed, 259 total
Snapshots:   2 passed, 2 total
```

Here are the results on an Intel i9-9900KS (5GHz / 8 cores 16 threads):<br><mark>A 21% speedup.</mark>

```bash
➜  test git:(development) ✗ hyperfine 'npm test' 'npm test -- --maxWorkers=50%'
Benchmark #1: npm test
  Time (mean ± σ):      4.763 s ±  0.098 s    [User: 49.334 s, System: 5.996 s]
  Range (min … max):    4.651 s …  4.931 s    10 runs

Benchmark #2: npm test -- --maxWorkers=50%
  Time (mean ± σ):      3.925 s ±  0.044 s    [User: 27.776 s, System: 4.028 s]
  Range (min … max):    3.858 s …  3.973 s    10 runs

Summary
  'npm test -- --maxWorkers=50%' ran
    1.21 ± 0.03 times faster than 'npm test'
```

And here are the results on a 2016 13" MacBook Pro (3.3GHz / 2 cores 4 threads):<br><mark>A 14% speedup.</mark>

```bash
➜  test git:(development) ✗ hyperfine 'npm test' 'npm test -- --maxWorkers=50%'
Benchmark #1: npm test
  Time (mean ± σ):     14.380 s ±  0.230 s    [User: 22.869 s, System: 3.689 s]
  Range (min … max):   14.049 s … 14.807 s    10 runs

Benchmark #2: npm test -- --maxWorkers=50%
  Time (mean ± σ):     12.567 s ±  0.213 s    [User: 19.628 s, System: 3.290 s]
  Range (min … max):   12.258 s … 12.942 s    10 runs

Summary
  'npm test -- --maxWorkers=50%' ran
    1.14 ± 0.03 times faster than 'npm test'
```

## What about running alongside other programs?

Measuring this is harder, but I have noticed that running with `--maxWorkers=25%` performs the best for my use cases.
This gives the best performance for `test:watch` alongside code watch/hot reloading, and for running `husky` commit hooks in parallel.

## What about CI?

In my [and other's](https://github.com/facebook/jest/issues/8202) experience, `--runInBand` can be the fastest option for CI runs.

What does `--runInBand` do? From the [official docs](https://jestjs.io/docs/cli#--runinband):

> Run all tests serially in the current process, rather than creating a worker pool of child processes that run tests. This can be useful for debugging.

Turns out, it's also useful in resource-constrained environments like CI, where the overhead of worker processes is higher than the speedup of running tests in parallel.

## Conclusion

Jest performance out of the box can be easily improved by tweaking `maxWorkers`.
If you decide to test this for yourself, I suggest using [hyperfine](https://github.com/sharkdp/hyperfine)--it's a great tool for comparing the performance of command line scripts.

Hope this was helpful! Feel free to reach out to me on Twitter [@VanTanev](https://twitter.com/VanTanev).

Happy hacking!
