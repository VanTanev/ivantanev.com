---
title: Reducing the Use of Array.reduce() - A Case Study
date: "2020-01-19T00:00:00+02:00"
description: Refactoring a complicated use of reduce() to code that is easier to read.
---

We are going to refactor a complicated use of reduce() to something more manageable, step by step.

## This is the refactoring we'll walk through today:

```diff
 import { FormikErrors } from 'formik'
-import map from 'lodash/map'
-import reduce from 'lodash/reduce'
-import flatten from 'lodash/flatten'
-import isArray from 'lodash/isArray'
-import isObject from 'lodash/isObject'
-import isString from 'lodash/isString'

 export const flattenErrors = <T extends unknown>(
     errors: FormikErrors<T>,
 ): string[] => {
-  return reduce<string[]>(
-    errors,
-    (memo, value) => {
-      if (isArray(value)) {
-        return memo.concat(
-          flatten(map(value, v => isString(v) ? v : flattenErrors(v))
-        )
-      } else if (isObject(v)) {
-        return memo.concat(flattenErrors(value))
-      } else {
-        return memo.concat(value as string)
-      }
-    },
-    [],
-  )
+  return Object.values(errors || {})
+    .flatMap(value =>
+      typeof value === "object" ? flattenErrors(value) : value
+    )
+    .filter((v): v is string => typeof v === "string")
 }
```

<br />

Recently [Jake Archibald](https://twitter.com/jaffathecake) made a tweet that left a strong impression on me (and evidently a few others):

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">All code using array.reduce should be rewritten without array.reduce so it&#39;s readable by humans *mutes thread*</p>&mdash; Jake Archibald (@jaffathecake) <a href="https://twitter.com/jaffathecake/status/1213077702300852224?ref_src=twsrc%5Etfw">January 3, 2020</a></blockquote>

In that thread he later provided [alternative and arguably simpler](https://twitter.com/jaffathecake/status/1213408714415333377) ways to achieve the same functionality as common uses of `Array.reduce()`.

This prompted me to look at my own code.
I found a function that recursively crawls an arbitrary `FormikErrors<T>` object and returns a flat array of all the error strings.
Here is the original implementation:

```typescript
import { FormikErrors } from "formik"
import map from "lodash/map"
import reduce from "lodash/reduce"
import flatten from "lodash/flatten"
import isArray from "lodash/isArray"
import isString from "lodash/isString"
import isObject from "lodash/isObject"

export const flattenErrors = <T extends unknown>(
  errors: FormikErrors<T>
): string[] => {
  return reduce<FormikErrors<T>, string[]>(
    errors,
    (memo, value) => {
      if (isArray(value)) {
        return memo.concat(
          flatten(map(value, (v) => (isString(v) ? v : flattenErrors(v))))
        )
      } else if (isObject(value)) {
        return memo.concat(flattenErrors(value))
      } else {
        return memo.concat(value as string)
      }
    },
    []
  )
}

test("flatten errors from deep sparse structures", () => {
  const input: any = {
    f1: {
      f1a: "a",
    },
    f2: "b",
    f3: [
      null,
      {
        f3a: [null, { f3a1: "c" }],
        f3b: "d",
      },
      null,
    ],
  }
  const output = ["a", "b", "c", "d"]
  expect(flattenErrors(input)).toEqual(output)
})
```

It is an all-around overcomplicated function.
Even before removing the use of reduce, there are some changes we can made to improve the readability.

We used `lodash/reduce()` for its ability to iterate over object values. This was not obvious, and we can make it explicit:

```diff
-    return reduce<string[]>(
-        errors,
-        (memo, value) => {
+    return Object.values(errors || {}).reduce<string[]>((memo, value) => {
```

We can use `Array.map()` directly and replace `lodash/flatten()` with this plain JS alternative:

```javascript
const flattened = [].concat(...arrayToFlatten)
```

```diff
                 return memo.concat(
-                    flatten(
-                        map(value, v =>
+                        ...value.map(v =>
                             typeof v === "string" ? v : flattenErrors(v)
                         )
-                    )
                 );

```

And we can get rid of all lodash methods, giving us:

```typescript
import { FormikErrors } from "formik"

export const flattenErrors = <T extends unknown>(
  errors: FormikErrors<T>
): string[] => {
  return Object.values(errors || {}).reduce<string[]>((memo, value) => {
    if (Array.isArray(value)) {
      return memo.concat(
        ...value.map((v) => (typeof v === "string" ? v : flattenErrors(v)))
      )
    } else if (typeof value === "object") {
      return memo.concat(flattenErrors(value))
    } else {
      return memo.concat(value as string)
    }
  }, [])
}
```

In this form it's easier to see that the only thing we're using `reduce()` for is to perform a recursive flatten of arrays and objects until we find a string.
We can pull this string check outside the `reduce()` in an `Array.filter()`.

```typescript
import { FormikErrors } from "formik"

export const flattenErrors = <T extends unknown>(
  errors: FormikErrors<T>
): string[] => {
  return Object.values(errors || {})
    .reduce<string[]>((memo, value) => {
      if (Array.isArray(value)) {
        return memo.concat(...value.map(flattenErrors))
      } else if (typeof value === "object") {
        return memo.concat(flattenErrors(value))
      } else {
        return memo.concat(value)
      }
    }, [])
    .filter((v): v is string => typeof v === "string")
}
```

Further, we can do this change:

```diff
       if (Array.isArray(value)) {
-        return memo.concat(...value.map(flattenErrors));
+        return memo.concat(flattenErrors(value));
       } else if (typeof value === "object") {
```

These two forms are equivalent. Let me illustrate:

```typescript
let value = ["1", null, "2"]
let memo = ["0"]

// using memo.concat(...value.map(flattenErrors)
{
  let r1 = memo.concat(...["1", null, "3"].map(flattenErrors))
  // unrolling the map, this becomes
  let r2 = memo.concat(
    ...[flattenErrors("1"), flattenErrors(null), flattenErrors("3")]
  )
  // executing the flattenErrors() fn, this is
  let r3 = memo.concat(...[["1"], [], ["3"]])
  // unrolling the spread, this becomes
  let r3 = memo.concat(["1"], [], ["3"])
  // concat result
  let r4 = ["0", "1", "3"]
}

// using memo.concat(flattenError(value))
{
  let r1 = memo.concat(flattenErrors(["1", null, "3"]))
  // flattenErrors() will return the array without the non-string value
  let r2 = memo.concat(["1", "3"])
  // concat result
  let r4 = ["0", "1", "3"]
}
```

We end up with some duplication:

```typescript{8-11}
import { FormikErrors } from "formik"

export const flattenErrors = <T extends unknown>(
  errors: FormikErrors<T>
): string[] => {
  return Object.values(errors || {})
    .reduce<string[]>((memo, value) => {
      if (Array.isArray(value)) {
        return memo.concat(flattenErrors(value))
      } else if (typeof value === "object") {
        return memo.concat(flattenErrors(value))
      } else {
        return memo.concat(value)
      }
    }, [])
    .filter((v): v is string => typeof v === "string")
}
```

The resulting code now has two `if`s that perform the same acion.
We can remove the `Arraty.isArray()` check, because every `Array` is an `Object`, so just checking if a value is an object is enough.

This gives us:

### Shortest version with reduce():

```typescript
import { FormikErrors } from "formik"

export const flattenErrors = <T extends unknown>(
  errors: FormikErrors<T>
): string[] => {
  return Object.values(errors || {})
    .reduce<string[]>((memo, value) => {
      if (typeof value === "object") {
        return memo.concat(flattenErrors(value))
      } else {
        return memo.concat(value)
      }
    }, [])
    .filter((v): v is string => typeof v === "string")
}
```

### Without reduce():

```typescript
import { FormikErrors } from "formik"

export const flattenErrors = <T extends unknown>(
  errors: FormikErrors<T>
): string[] => {
  return Object.values(errors || {})
    .flatMap((value) =>
      typeof value === "object" ? flattenErrors(value) : value
    )
    .filter((v): v is string => typeof v === "string")
}
```

### Without reduce() and with some lodash helpers for ES2015 compatability:

Since `Object.values()` and `Array.flatMap()` are not supported everywhere, it might make sense to use `lodash` for them.
`isString` aslo makes for a neat helper in TypeScript:

```typescript
import { FormikErrors } from "formik"
import values from "lodash/values"
import flatMap from "lodash/flatMap"
import isString from "lodash/isString"

export const flattenErrorsLodash = <T extends unknown>(
  errors: FormikErrors<T>
): string[] => {
  return flatMap(values<unknown>(errors), (value) =>
    typeof value === "object" ? flattenErrors(value) : value
  ).filter(isString)
}
```

## What we learned

Once we refactored the function down, it becomes clear that the only meaningful use of `Array.reduce()` was to kludge `Array.flatMap()`.
Previously, `reduce()` allowed us to do too much inside, and the code was a mess.
We were using `reduce()` to replace a `values()`, `flatten()`, `filter()`, and `map()`.
Pulling out those uses into discrete parts made the intent of the code much clearer.
