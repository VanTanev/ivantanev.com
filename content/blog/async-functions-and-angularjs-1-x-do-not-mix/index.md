---
title: Async functions and AngularJS 1.x do not mix
date: "2020-01-18T00:00:00+02:00"
description: On writing idiomatic AngularJS
published: true
---

Recently, I was refactoring an AngularJS 1.x project and wrote the following code:

```javascript
// THIS CODE WILL BREAK YOUR AngularJS APPLICATION, DO NOT USE!
async function updateItem(item) {
  const { data: updatedItem } = await $http.put(`/items/${item.id}`, item)
  return updatedItem
}
```

While the above might seem like completely reasonable and modern JavaScript, attempting to use it will break Angular's digest cycle.
You should not use `async`, and instead use the older style of promises:

```javascript
function updateItem(item) {
  return $http
    .put(`/items/${item.id}`, item)
    .then(({ data: updatedItem }) => updatedItem)
}
```

The issue comes up here:

<!-- prettier-ignore-start -->
```javascript{6}
function SomeCtrl(initialItem) {
  this.item = initialItem

  this.onClick = function() {
    updateItem(this.item)
      .then(updatedItem => (this.item = updatedItem))
  }
}
```
<!-- prettier-ignore-end -->

> The `async function` implementation of `updateItem()` would break the following line.
> The changed `this.item` on the controller will not be reflected in the DOM, or watchers, until a random digest cycle from some other code picks it up.

The reason is the same as why AngularJS provides interfaces like `$timeout()`, `$interval()` and its own Promise library, `$q`.
AngularJS needs to wrap asynchronous interfaces in order to execute its digest cycle after they finish.
The digest cycle is responsible for triggering watchers, rerendering DOM nodes and many more.

Because we used an `async function` in the first example, we're in the same predicament as if we'd used `setTimeout()` directly instead of `$timeout()`.
There is no way for AngularJS to track when the execution of the async function concluded.

To make the `async function` work in our controller, we would need to do:

```javascript{5-6}
function SomeCtrl(initialItem) {
  this.item = initialItem

  this.onClick = function() {
    $q.resolve(updateItem(this.item)).then(
      updatedItem => (this.item = updatedItem)
    )
  }
}
```

or use another async function and a `$rootScope.apply()` around our controller change

```javascript{4-9}
function SomeCtrl(initialItem) {
  this.item = initialItem

  this.onClick = async function() {
    const updatedItem = await updateItem(this.item)
    $rootScope.$apply(() => {
      this.item = updatedItem
    })
  }
}
```

We end up manually wrapping any effects of `async function` code into `$rootScope.$apply()`, or wrap Promises with `$q.resolve()`. This makes it not worth using `async function` in the first place. This is unfortunate when we need to coordinate multiple async tasks, as the `async/await` interfaces make that much nicer.

### In conclusion

Modern async/await functions are great, and its tempting to want to use them when refactoring old code. However, it's not worth the hassle in AngularJS 1.X projects. We'll have to stick to the `$q` promise interfaces instead.
