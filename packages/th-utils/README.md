# 

th-utils
=========

A node module providing compatible utility methods to other modules by the same author, now ported to npm conventions.

This module is not recommended for any other purpose.

## Usage

```js
// these are incomplete examples listing only a few methods
var th = require('./th-utils');

var assert = th.assert;
var Logger = th.Logger;

 var passesTest = false;
 assert(passesTest, "accepts a condition, sprintf-style fmt string, variable args like %s and %z", 
  "Hi", {a:1, b:2} );

Logger.log("also takes a sprintf style string, and for now just maps to console.log");

```

## Tests

Run gulp default target to execute tests

```shell
   gulp
```

