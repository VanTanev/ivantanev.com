---
title: Async Functions and AngularJs 1.X Do Not Mix
date: "2020-01-18T00:00:00+02:00"
description: Fixing issues caused by async/await in AngularJS
published: true
---

Recently, I was refactoring an AngularJS 1.x project and wrote the following code:

```javascript
// DO NOT USE THIS CODE, IT BREAKS ANGULARJS!
// Combining $http with async functions does not work in AngularJS 1.X
async function updateItem(item) {
  const { data } = await $http.put(`/items/${item.id}`, item)
  return data
}
```

While the above might seem innocent enough, it breaks Angular's digest cycle.
When the promise fulfills, you will not see the page update.

### What you should do instead?

Do not use `await/async` with [\$http](https://docs.angularjs.org/api/ng/service/$http).
Instead, use the old promise style, with `.then()`.

```javascript
// Use promise.then() instead of async/await
function updateItem(item) {
  return $http.put(`/items/${item.id}`, item).then(({ data }) => data)
}
```

While the above might seem like completely reasonable and modern JavaScript, attempting to use it will break Angular's digest cycle.

### Where does it break?

Let's look at what the browser does when it executes the `async/await` code

```javascript{6,13}
// DO NOT USE THIS CODE, IT BREAKS ANGULARJS!
// Combining $http with async functions does not work in AngularJS 1.X

// This function:
async function updateItem(item) {
  const { data } = await $http.put(`/items/${item.id}`, item)
  return data
}


// Is equivalent to the following code:
function updateItem(item) {
  return Promise.resolve($http.put(`/items/${item.id}`, item)).then((value) => {
    const { data } = value
    return data
  })
}
```

As you can see, the original `$q` promise returned from `$http.put()` is wrapped in a new `Promise.resolve()`.
This means AngularJS can no longer track when the promise settles.

The issue comes up when you try to use the async version of `updateItem()` in a controller:

```javascript{6}
function SomeCtrl($scope, initialItem) {
  $scope.item = initialItem

  this.onClick = function() {
    updateItem($scope.item)
      .then(updatedItem => ($scope.item = updatedItem))
  }
}
```

> The `async function` implementation of `updateItem()` would break the highlighted line.
> The changed `$scope.item` variable will not be reflected in the DOM, or watchers, until a random digest cycle executes.

### The reason is that AngularJS cannot know when a plain promise resolves.

AngularJS has special wrappers for browser primitives--[\$timeout](https://docs.angularjs.org/api/ng/service/$timeout), [\$interval](https://docs.angularjs.org/api/ng/service/$q) and its own Promise library [\$q](https://docs.angularjs.org/api/ng/service/$q).
AngularJS needs to wrap these asynchronous interfaces in order to track when they complete, and run a [$rootScope.$digest()](https://docs.angularjs.org/api/ng/type/$rootScope.Scope#$digest) cycle.

When we used an `async function`, we're in the same predicament as if we'd used `setTimeout()` directly instead of `$timeout()`--there is no way for AngularJS to track when the execution of the async function completed.

To make the `async function` work in our controller, we would need to re-wrap it with `$q.resolve()`:

```javascript{5-7}
function SomeCtrl($q, $scope, initialItem) {
  $scope.item = initialItem

  this.onClick = function() {
    $q.resolve(updateItem($scope.item)).then(
      updatedItem => ($scope.item = updatedItem)
    )
  }
}
```

Or we could use another `async function` and a [\$apply()](https://docs.angularjs.org/api/ng/type/$rootScope.Scope#$apply) around our controller property assignment:

```javascript{4-9}
function SomeCtrl($scope, initialItem) {
  $scope.item = initialItem

  this.onClick = async function() {
    const updatedItem = await updateItem($scope.item)
    $scope.$apply(() => {
      $scope.item = updatedItem
    })
  }
}
```

We end up having to manually wrap any effects of `async function` code with `$scope.$apply()`, or wrap Promises with `$q.resolve()`.
This makes it not worth using `async/await` in the first place.
This is unfortunate when we need to coordinate multiple async tasks, as the `async/await` interfaces make that much nicer.

### In conclusion

Modern `async/await` functions are great, and its tempting to want to use them when refactoring old code.
However, it's not worth the hassle in AngularJS 1.X projects.
We'll have to stick to the `$q` promise interfaces instead.
