# Djel (djexl-js)

Dynamic javascript Expression Language: Powerful context-based expression parser and evaluator.

`Djel` is a fork of [Jexl](https://github.com/TomFrost/Jexl).

## Quick start

```javascript
const Djel = require('djexl-js').default;
const djel = Djel();

// add Transform
djel.addTransforms({
  upper: (val) => val.toUpperCase(),
  find: (arr, by) => arr.find(by),
});

const context = {
  name: { first: 'Sterling', last: 'Archer' },
  assoc: [
    { first: 'Lana', last: 'Kane' },
    { first: 'Cyril', last: 'Figgis' },
    { first: 'Pam', last: 'Poovey' },
  ],
  age: 36,
};

let res;

// find in an array
res = djel.evaluate('assoc|find(@.first == "Lana").last', context);
console.log(res); // Output: Kane

// Do math
res = djel.evaluate('age * (3 - 1)', context);
console.log(res); // Output: 72

// Concatenate
res = djel.evaluate('name.first + " " + name["la" + "st"]', context);
console.log(res); // Output: Sterling Archer

// Compound
res = djel.evaluate('assoc|find(@.last == "Figgis").first == "Cyril" && assoc|find(@.last == "Poovey").first == "Pam"', context);
console.log(res); // Output: true

// Use array indexes
res = djel.evaluate('assoc[1]', context);
console.log(res.first + ' ' + res.last); // Output: Cyril Figgis

// Use conditional logic
res = djel.evaluate('age > 62 ? "retired" : "working"', context);
console.log(res); // Output: working

res = djel.evaluate('"duchess"|upper + " " + name.last|upper', context);
console.log(res); // Output: DUCHESS ARCHER

// Add your own operators
// Here's a case-insensitive string equality
djel.addBinaryOps({
  '_=': {
    priority: 30,
    fn: (left, right) => left.toLowerCase() === right.toLowerCase(),
  },
});
res = djel.evaluate('"Guest" _= "gUeSt"');
console.log(res); // Output: true
```

## Installation

For Node.js or Web projects, type this in your project folder:

```bash
yarn add djexl-js
```

Access `Djel` the same way, backend or front:

```javascript
import Djel from 'djexl-js';
```

## All the details

### Unary Operators

| Operation      | Symbol |
|----------------|:------:|
| Negate         |  `!`   |
| Unary plus     |  `+`   |
| Unary negation |  `-`   |

### Binary Operators

| Operation                  |    Symbol    |
|----------------------------|:------------:|
| Add, Concat Strings/Arrays |     `+`      |
| Subtract                   |     `-`      |
| Multiply                   |     `*`      |
| Divide                     |     `/`      |
| Divide and floor           |     `//`     |
| Modulus                    |     `%`      |
| Power of                   |     `^`      |
| Logical AND                |     `&&`     |
| Logical OR                 | &#124;&#124; |

#### Concat Arrays/Objects use `+`

| Expression    | Result      |
|---------------|-------------|
| `[1,2]+[3,4]` | `[1,2,3,4]` |
| `{x:1}+{y:2}` | `{x:1,y:2}` |

### Comparisons

| Comparison                 | Symbol |
|----------------------------|:------:|
| Equal                      |  `==`  |
| Not equal                  |  `!=`  |
| Greater than               |  `>`   |
| Greater than or equal      |  `>=`  |
| Less than                  |  `<`   |
| Less than or equal         |  `<=`  |
| Element in array or string |  `in`  |

#### A note about `in`:

The `in` operator can be used to check for a substring:
`"Cad" in "Ron Cadillac"`, and it can be used to check for an array element:
`"coarse" in ['fine', 'medium', 'coarse']`.

However, the `===` operator is used
behind-the-scenes to search arrays, so it should not be used with arrays of
objects.
The following expression returns false: `{a: 'b'} in [{a: 'b'}]`.

### Ternary operator

Conditional expressions check to see if the first segment evaluates to a truthy
value. If so, the consequent segment is evaluated. Otherwise, the alternate
is. If the consequent section is missing, the test result itself will be used
instead.

| Expression                          | Result     |
|-------------------------------------|------------|
| `"" ? "Full" : "Empty"`             | `"Empty"`  |
| `"foo" in "foobar" ? "Yes" : "No"`  | `"Yes"`    |
| `{agent: "Archer"}.agent ?: "Kane"` | `"Archer"` |

### Native Types

| Type     |              Examples              |
|----------|:----------------------------------:|
| Booleans |          `true`, `false`           |
| Strings  | `"Hello \"user\""`, `'Hey there!'` |
| Numerics |    `6`, `-7.2`, `5`, `-3.14159`    |
| Objects  |        `{hello: "world!"} `        |
| Arrays   |       `['hello', 'world!']`        |

### Groups

Parentheses work just how you'd expect them to:

| Expression                          | Result |
|-------------------------------------|:-------|
| `(83 + 1) / 2`                      | `42`   |
| 1 < 3 && (4 > 2 &#124;&#124; 2 > 4) | `true` |

### Identifiers

Access variables in the context object by just typing their name. Objects can
be traversed with dot notation, or by using brackets to traverse to a dynamic
property name.

The optional chaining operator (`?.`) accesses an object's property or calls a function.
If the object is `undefined` or `null`, it returns `undefined` instead of throwing an error.

Example context:

```javascript
{
  name: {
    first: "Malory",
    last: "Archer"
  },
  exes: [
    "Nikolai Jakov",
    "Len Trexler",
    "Burt Reynolds"
  ],
  lastEx: 2
}
```

| Expression          | Result            |
|---------------------|-------------------|
| `name.first`        | `"Malory"`        |
| `name["first"]`     | `"Malory"`        |
| `name['la' + 'st']` | `"Archer"`        |
| `exes[2]`           | `"Burt Reynolds"` |
| `exes[lastEx - 1]`  | `"Len Trexler"`   |
| `exes[-1]`          | `"Burt Reynolds"` |
| `exes[-2]`          | `"Len Trexler"`   |
| `foo?.bar.baz`      | `undefined`       |

#### A note about array index:

You can use a negative number to index an array in the end side.

### Define local variables

You can use `def` keyword to define local variables. The `def` in sub-expression has a local scope. And `def` can
override the `Context` variables in its local scope.

| Expression                                                        | Result |
|-------------------------------------------------------------------|--------|
| `def a = 1; def b = a + 1; a + b`                                 | 3      |
| `def a = 1; (true ? (def a = 10; a) : 0) + a`                     | 11     |
| with context: `{ a: 1 }` <br/> `(true ? (def a = 10; a) : 0) + a` | 11     |

### Transform

The power of `Djel` is in transforming data.
Transform functions take one or more arguments: The value to be transformed,
followed by anything else passed to it in the expression.

Add them with `djel.addTransforms`.

```javascript
djel.addTransforms({
  split: (var, char) => val.split(char),
  lower: (val) => val.toLowerCase(),
});
```

| Expression                                 | Result                  |
|--------------------------------------------|-------------------------|
| "Pam Poovey"&#124;lower&#124;split(' ')[1] | `"poovey"`              |
| "password==guest"&#124;split('=' + '=')    | `['password', 'guest']` |

#### A function in Context can be a Transform

Example context:

```javascript
{
  data: 'Pam Poovey',
  lower: (val) => val.toLowerCase(),
}
```

| Expression        | Result         |
|-------------------|----------------|
| data&#124;(lower) | `"pam poovey"` |

Note that you should add a pair of parentheses if the function not in root context.

### Lambda

You can define a `Lambda` in a `Transform`. A `Lambda` can either be a `Transform` or be a `Transform` argument.

In a `Lambda` expression, `@` or `@0` means the first argument of the function call.
And `@1` to `@9` means the second to tenth argument.

Example:

```
@.x + @1
```

means

```javascript
(...args) => args[0].x + args[1]
```

Note that `Lambda` can only define as a `Transform` or a `Transform` argument. And `Lambda` cannot nest.

#### A `Lambda` as a `Transform` argument

Example context:

```javascript
{
  users: [
    { age: 18, name: "Nikolai Jakov" },
    { age: 17, name: "Len Trexler" },
    { age: 19, name: "Burt Reynolds" },
  ],
}
```

```javascript
djel.addTransforms({
  filter: (arr, by) => arr.filter(by),
  map: (arr, by) => arr.map(by),
  sum: (arr, by) => arr.reduce((s, i) => s + (by(i) || 0), 0),
});
```

| Expression                         | Result                               |
|------------------------------------|--------------------------------------|
| users&#124;filter(@.age<18)        | `[{ age: 17, name: "Len Trexler" }]` |
| users&#124;map(@.age)              | `[18,17,19]`                         |
| users&#124;sum(@.age)/users.length | `18`                                 |

### A `Lambda` as a `Transform`

| Expression            | Result   |
|-----------------------|----------|
| (1+2+3)&#124;({x:@}}) | `{x: 6}` |

### Context

Variable contexts are straightforward Javascript objects that can be accessed
in the expression.

### API

#### Djel

A reference to the `Djel`. To maintain separate instances of `Djel`
with each maintaining its own set of transforms, simply re-instantiate with

```javascript
const djel = Djel()
```

#### evaluate

```typescript
evaluate: (exp: string, context?: any) => any
```

Evaluates an expression. The context are optional.

#### compile

```typescript
compile: (exp: string) => {
  evaluate: (context?: any) => any;
}
```

Compile an expression. The returned object can
then be evaluated multiple times with different contexts,
without generating any additional string processing overhead.

#### addBinaryOps

```typescript
addBinaryOps: (binaryOps: Record<string, {
  priority: number;
  fn: (left: any, right: any) => any;
}>) => void
```

Adds a binary operator to the `Djel` instance. A binary operator is one that
considers the values on both its `left` and `right`, such as `"+"` or `"=="`, in order
to calculate a result. The `priority` determines the operator's position in the
order of operations. The provided function will be called with two arguments:
a `left` value and a `right` value.

The `priority` of existing operators (please refer to `src/grammar.ts`).

| Priority |             Symbols              | Operators                   |
|:--------:|:--------------------------------:|-----------------------------|
|    10    |           &#124;&#124;           | Logic OR                    |
|    20    |               `&&`               | Logic AND                   |
|    30    |            `==`  `!=`            | Equality                    |
|    40    |      `<=` `<` `>=` `>` `in`      | Comparison                  |
|    50    |             `+` `-`              | Add, Concat, Subtract       |
|    60    |         `*` `/` `//` `%`         | Multiply, Divide, Modulus   |
|    70    |               `^`                | Power of                    |
|    80    |              &#124;              | Transform                   |
|    90    |           `!` `+` `-`            | Unary                       |
|   100    | `[]` `.` `()` `?.[]` `?.` `?.()` | Member access/Function Call |

#### addUnaryOps

```typescript
addUnaryOps: (unaryOps: Record<string, {
  priority: number;
  fn: (left: any) => any;
}>) => void
```

Adds a unary operator to the `Djel` instance. A unary operator is one that
considers only the value on its `right`, such as `"!"`, in order to calculate a
result. The provided function will be called with one argument: the value to
the operator's `right`.

#### addTransforms

```typescript
addTransforms: (transforms: Record<string, Function>) => void
```

Adds a transform function to this `Djel` instance. See the **Transform**
section above for information on the structure of a transform function.

#### removeOp

```typescript
removeOp: (operator: string) => void
```

Removes a binary or unary operator from the `Djel` instance.
For example, `"^"` can be passed to eliminate the "power of" operator.

#### removeTransform

```typescript
removeTransform: (transformName: string) => void
```

Removes a transform function from the `Djel` instance.

## License

`Djel` is licensed under the MIT license. Please see `LICENSE.txt` for full
details.
