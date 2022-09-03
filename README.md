# Del

Javascript Expression Language: Powerful context-based expression parser and evaluator.

Del is a fork of [Jexl](https://github.com/TomFrost/Jexl) .

## Quick start

```javascript
const del = Del();

// add Transform
del.addTransforms({
    upper: (val) => val.toUpperCase(),
    find: (arr, by) => arr.find(by),
});

const context = {
    name: {first: 'Sterling', last: 'Archer'},
    assoc: [
        {first: 'Lana', last: 'Kane'},
        {first: 'Cyril', last: 'Figgis'},
        {first: 'Pam', last: 'Poovey'}
    ],
    age: 36
};

// find in an array
const res = del.evaluate('assoc|find(@.first == "Lana").last', context);
console.log(res); // Output: Kane

// Do math
const res = del.evaluate('age * (3 - 1)', context);
console.log(res); // Output: 72

// Concatenate
const res = del.evaluate('name.first + " " + name["la" + "st"]', context);
console.log(res); // Output: Sterling Archer

// Compound
const res = del.evaluate('assoc|find(@.last == "Figgis").first == "Cyril" && assoc|find(@.last == "Poovey").first == "Pam"', context);
console.log(res); // Output: true

// Use array indexes
const res = del.evaluate('assoc[1]', context);
console.log(res.first + ' ' + res.last); // Output: Cyril Figgis

// Use conditional logic
const res = del.evaluate('age > 62 ? "retired" : "working"', context);
console.log(res); // Output: working

const res = del.evaluate('"duchess"|upper + " " + name.last|upper', context);
console.log(res); // Output: DUCHESS ARCHER

// Add your own operators
// Here's a case-insensitive string equality
del.addBinaryOps({
    '_=': {
        priority: 30,
        fn: (left, right) => left.toLowerCase() === right.toLowerCase(),
    },
});
const res = del.evaluate('"Guest" _= "gUeSt"');
console.log(res); // Output: true
```

## Installation

For Node.js or Web projects, type this in your project folder:

```bash
yarn add del
```

Access del the same way, backend or front:

```javascript
import Del from 'del';
```

## All the details

### Unary Operators

| Operation | Symbol |
|-----------|:------:|
| Negate    |   !    |
| Negate    |   +    |
| Negate    |   -    |

### Binary Operators

| Operation        |    Symbol    |
|------------------|:------------:|
| Add, Concat      |      +       |
| Subtract         |      -       |
| Multiply         |      *       |
| Divide           |      /       |
| Divide and floor |      //      |
| Modulus          |      %       |
| Power of         |      ^       |
| Logical AND      |      &&      |
| Logical OR       | &#124;&#124; |

### Comparisons

| Comparison                 | Symbol |
|----------------------------|:------:|
| Equal                      |   ==   |
| Not equal                  |   !=   |
| Greater than               |  &gt;  |
| Greater than or equal      | &gt;=  |
| Less than                  |   <    |
| Less than or equal         |   <=   |
| Element in array or string |   in   |

#### A note about `in`:

The `in` operator can be used to check for a substring:
`"Cad" in "Ron Cadillac"`, and it can be used to check for an array element:
`"coarse" in ['fine', 'medium', 'coarse']`. However, the `==` operator is used
behind-the-scenes to search arrays, so it should not be used with arrays of
objects. The following expression returns false: `{a: 'b'} in [{a: 'b'}]`.

### Ternary operator

Conditional expressions check to see if the first segment evaluates to a truthy
value. If so, the consequent segment is evaluated. Otherwise, the alternate
is. If the consequent section is missing, the test result itself will be used
instead.

| Expression                        | Result |
|-----------------------------------|--------|
| "" ? "Full" : "Empty"             | Empty  |
| "foo" in "foobar" ? "Yes" : "No"  | Yes    |
| {agent: "Archer"}.agent ?: "Kane" | Archer |

### Native Types

| Type     |            Examples            |
|----------|:------------------------------:|
| Booleans |        `true`, `false`         |
| Strings  | "Hello \"user\"", 'Hey there!' |
| Numerics |      6, -7.2, 5, -3.14159      |
| Objects  |       {hello: "world!"}        |
| Arrays   |      ['hello', 'world!']       |

### Groups

Parentheses work just how you'd expect them to:

| Expression                          | Result |
|-------------------------------------|:-------|
| (83 + 1) / 2                        | 42     |
| 1 < 3 && (4 > 2 &#124;&#124; 2 > 4) | true   |

### Identifiers

Access variables in the context object by just typing their name. Objects can
be traversed with dot notation, or by using brackets to traverse to a dynamic
property name.

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

| Expression        | Result        |
|-------------------|---------------|
| name.first        | Malory        |
| name['la' + 'st'] | Archer        |
| exes[2]           | Burt Reynolds |
| exes[lastEx - 1]  | Len Trexler   |

### Transform

TODO

### Lambda

TODO

### Context

Variable contexts are straightforward Javascript objects that can be accessed
in the expression, but they have a hidden feature: they can include a Promise
object, and when that property is used, del will wait for the Promise to
resolve and use that value!

### API

TODO

## License

Del is licensed under the MIT license. Please see `LICENSE.txt` for full
details.
