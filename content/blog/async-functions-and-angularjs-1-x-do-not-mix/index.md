---
title: Async functions and AngularJS 1.x do not mix
date: "2020-01-18T00:00:00+02:00"
description: On writing idiomatic AngularJS
published: true
---

Recently, I was refactoring an AngularJS 1.x project and wrote the following code:

```javascript
// Combining $http with async functions will break your AngularJS application!
// Do not use!
async function updateItem(item) {
  const { data: updatedItem } = await $http.put(`/items/${item.id}`, item)
  return updatedItem
}
```

While the above might seem like completely reasonable and modern JavaScript, attempting to use it will break Angular's digest cycle.
You should not use `async/await` alongside [\$http](https://docs.angularjs.org/api/ng/service/$http), and instead use the older style of promises:

```javascript
// The plain promise approach is safe to use
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

> The `async function` implementation of `updateItem()` would break the highlighted line.
> The changed `this.item` on the controller will not be reflected in the DOM, or watchers, until a random digest cycle from some other code picks it up.

The reason is the same as why AngularJS provides interfaces like [\$timeout](https://docs.angularjs.org/api/ng/service/$timeout), [\$interval](https://docs.angularjs.org/api/ng/service/$q) and its own Promise library [\$q](https://docs.angularjs.org/api/ng/service/$q).
AngularJS needs to wrap asynchronous interfaces in order to execute its digest cycle after they finish.
The digest cycle is responsible for triggering watchers, rerendering DOM nodes and many more.

Because we used an `async function` in the first example, we're in the same predicament as if we'd used `setTimeout()` directly instead of `$timeout()`.
There is no way for AngularJS to track when the execution of the async function concluded.

To make the `async function` work in our controller, we would need to do:

```javascript{5-7}
function SomeCtrl($q, initialItem) {
  this.item = initialItem

  this.onClick = function() {
    $q.resolve(updateItem(this.item)).then(
      updatedItem => (this.item = updatedItem)
    )
  }
}
```

Or we could use another `async function` and a [\$apply()](https://docs.angularjs.org/api/ng/type/$rootScope.Scope#$apply) around our controller property assignment:

```javascript{4-9}
function SomeCtrl($scope, initialItem) {
  this.item = initialItem

  this.onClick = async function() {
    const updatedItem = await updateItem(this.item)
    $scope.$apply(() => {
      this.item = updatedItem
    })
  }
}
```

We end up manually wrapping any effects of `async function` code into `$scope.$apply()`, or wrap Promises with `$q.resolve()`.
This makes it not worth using `async function` in the first place.
This is unfortunate when we need to coordinate multiple async tasks, as the `async/await` interfaces make that much nicer.

### In conclusion

Modern async/await functions are great, and its tempting to want to use them when refactoring old code.
However, it's not worth the hassle in AngularJS 1.X projects.
We'll have to stick to the `$q` promise interfaces instead.
