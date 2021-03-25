---
title: Make Your Jest Tests up to 20% Faster by Changing a Single Setting
date: "2021-03-21T10:25:48+02:00"
description: Optimize the Jest worker count for faster test execution
published: true
---

## TL;DR

When you have `Jest` as your test runner, passing the `--maxWorkers=50%` option will make the tests faster in most cases. For watch mode, use `--maxWorkers=25%`, and for CI disable Jest workers with `--runInBand`. You can experiment with the percentage and fine-tune for your particular setup.

```json
// package.json
{
  "scripts": {
    // standalone Jest
    "test": "jest --maxWorkers=50%",
    "test:watch": "jest --watch --maxWorkers=25%",
    "test:ci": "jest --runInBand",

    // or with Create React App
    "test": "react-scripts test --watchAll=false --maxWorkers=50%",
    "test:watch": "react-scripts test --maxWorkers=25%",
    "test:ci": "react-scripts test --watchAll=false --runInBand"
  }
}
```

## How Jest selects the number of workers to use

The [Jest test runner](https://github.com/facebook/jest)—that is also supplied by default with [Create React App](https://reactjs.org/docs/create-a-new-react-app.html)—does not run optimally out of the box.

By default, [Jest will run on all available CPU threads](https://github.com/facebook/jest/blob/2d965261493febb8e6c679965010f29ea8c9316a/packages/jest-config/src/getMaxWorkers.ts#L23-L32), using one thread for the cli process and the rest for test workers. When in watch mode, it will use half the available CPU threads.

This however results in sub-optimal performance on all systems I tested on.

We can adjust `--maxWorkers` by either providing a number of threads, or a percentage of the available system threads. I prefer using percentage, as it's usually easy to find a value that works across multiple systems with different CPUs.

## Benchmarking Jest with and without --maxWorkers=50%

These are the stats for the testsuite used. It's a React app with mostly unit tests:

```bash
Test Suites: 43 passed, 43 total
Tests:       1 skipped, 258 passed, 259 total
Snapshots:   2 passed, 2 total
```

Here are the results on an Intel i9-9900KS (5GHz / 8 cores 16 threads):<br><mark>A 21% speedup.</mark>

```bash
$ hyperfine 'npm test' 'npm test -- --maxWorkers=50%'
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
$ hyperfine 'npm test' 'npm test -- --maxWorkers=50%'
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

And finally, a 2020 M1 MacBook Air:<br><mark>A 12% speedup.</mark>
```bash
$ hyperfine 'npm test' 'npm test -- --maxWorkers=50%'
Benchmark #1: npm test
  Time (mean ± σ):      9.782 s ±  0.115 s    [User: 10.874 s, System: 1.548 s]
  Range (min … max):    9.686 s …  9.908 s    3 runs

Benchmark #4: npm test --maxWorkers=4
  Time (mean ± σ):      5.216 s ±  0.060 s    [User: 19.301 s, System: 3.523 s]
  Range (min … max):    5.179 s …  5.285 s    3 runs

Summary
  'npm test -- --maxWorkers=50%' ran
    1.12 ± 0.01 times faster than 'npm test'
```
## What about running alongside other programs?

Measuring this is harder, but I have noticed that running with `--maxWorkers=25%` performs the best for my use cases.
This gives the best performance for `test:watch` alongside code watch/hot reloading, and for running `husky` commit hooks in parallel.

## What about CI?

In my [and other's](https://github.com/facebook/jest/issues/8202) experience, `--runInBand` can be the fastest option for CI runs.

What does `--runInBand` do? From the [official docs](https://jestjs.io/docs/cli#--runinband):

> Run all tests serially in the current process, rather than creating a worker pool of child processes that run tests. This can be useful for debugging.

Turns out, it's also useful in resource-constrained environments like CI, where the overhead of worker processes is higher than the speedup of running tests in parallel.

## Finding the optimal number of threads for a given testsuite/system

It's easy to write a small script to find the optimal number of threads for your particular usecase:
```bash
export MAX_WORKERS=15; hyperfine --parameter-scan num_threads 1 $MAX_WORKERS 'npm run test -- --maxWorkers={num_threads}' -m 3 -w 1
```

Here are the results on an Intel i9-9900KS (5GHz / 8 cores 16 threads):

```bash
Summary
  'npm run test:jest -- --maxWorkers=7' ran
    1.01 ± 0.01 times faster than 'npm run test:jest -- --maxWorkers=8'
    1.02 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=6'
    1.04 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=5'
    1.05 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=9'
    1.08 ± 0.03 times faster than 'npm run test:jest -- --maxWorkers=10'
    1.11 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=11'
    1.11 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=4'
    1.18 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=13'
    1.19 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=14'
    1.21 ± 0.04 times faster than 'npm run test:jest -- --maxWorkers=12'
    1.23 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=15'
    1.25 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=3'
    1.58 ± 0.02 times faster than 'npm run test:jest -- --maxWorkers=2'
    2.55 ± 0.04 times faster than 'npm run test:jest -- --maxWorkers=1'
```

As you can see, the optimal number of workers in this case is 7, not the 8 that `50%` would give us. However the difference between the two is within the margin of error, and `50%` is more flexible.

## Conclusion

Jest performance out of the box can be easily improved by tweaking `maxWorkers`. If you decide to test this for yourself, [hyperfine](https://github.com/sharkdp/hyperfine) makes it very easy.

Hope this was helpful! Feel free to reach out to me on Twitter [@VanTanev](https://twitter.com/VanTanev).

Happy hacking!
