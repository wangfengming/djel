# Djel (djexl-js)

Dynamic javascript Expression Language: 一个简单的表达式解析求值器.

`Djel` is a fork of [Jexl](https://github.com/TomFrost/Jexl).

## 快速开始

```javascript
const Djel = require('djexl-js').default;
const djel = Djel();

// add Transform
djel.addTransforms({
  upper: (val) => val.toUpperCase(),
  find: (arr, by) => arr.find(by),
});

const variables = {
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
res = djel.evaluate('assoc|find(@.first == "Lana").last', variables);
console.log(res); // Output: Kane

// Do math
res = djel.evaluate('age * (3 - 1)', variables);
console.log(res); // Output: 72

// Concatenate
res = djel.evaluate('name.first + " " + name["la" + "st"]', variables);
console.log(res); // Output: Sterling Archer

// Compound
res = djel.evaluate('assoc|find(@.last == "Figgis").first == "Cyril" && assoc|find(@.last == "Poovey").first == "Pam"', variables);
console.log(res); // Output: true

// Use array indexes
res = djel.evaluate('assoc[1]', variables);
console.log(res.first + ' ' + res.last); // Output: Cyril Figgis

// Use conditional logic
res = djel.evaluate('age > 62 ? "retired" : "working"', variables);
console.log(res); // Output: working

res = djel.evaluate('"duchess"|upper + " " + name.last|upper', variables);
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

## 安装使用

```bash
yarn add djexl-js
```

```javascript
import Djel from 'djexl-js';
```

## 注入变量

求值时，可以注入变量。如

```javascript
const variables = { age: 10 };

djel.evaluate('age * (3 - 1)', variables); // => 20

// 或者
const expression = djel.compile('age * (3 - 1)');
expression.evaluate(variables); // => 20
```

## 一元操作符

| 操作符 | 符号  |
|-----|:---:|
| 取反  | `!` |
| 加号  | `+` |
| 减号  | `-` |

## 二元操作符

| 操作符            |      符号      |
|----------------|:------------:|
| 加号，字符串/数组/对象拼接 |     `+`      |
| 减              |     `-`      |
| 乘              |     `*`      |
| 除              |     `/`      |
| 整除             |     `//`     |
| 取模             |     `%`      |
| 指数             |     `^`      |
| 逻辑与            |     `&&`     |
| 逻辑或            | &#124;&#124; |
| 空值合并           |     `??`     |

- `+` 支持数组/对象拼接

| 表达式           | 结果          |
|---------------|-------------|
| `[1,2]+[3,4]` | `[1,2,3,4]` |
| `{x:1}+{y:2}` | `{x:1,y:2}` |

## 比较

| 操作符  |  符号  |
|------|:----:|
| 相等   | `==` |
| 不等   | `!=` |
| 大于   | `>`  |
| 大于等于 | `>=` |
| 小于   | `<`  |
| 小于等于 | `<=` |
| in   | `in` |

- 关于 `in`:

`in` 操作符可以检查字字符串，如：`"Cad" in "Ron Cadillac"`。

也可以用于检查元素是否在数组中，如：`"coarse" in ['fine', 'medium', 'coarse']`，但是这个判断是使用引用比较，因此 `{a: 'b'} in [{a: 'b'}]` 的结果是 `false`。

## 三元表达式

| 表达式                                 | 结果         |
|-------------------------------------|------------|
| `"" ? "Full" : "Empty"`             | `"Empty"`  |
| `"foo" in "foobar" ? "Yes" : "No"`  | `"Yes"`    |
| `{agent: "Archer"}.agent ?: "Kane"` | `"Archer"` |

## 类型

| 类型      |                 示例                 |
|---------|:----------------------------------:|
| Boolean |          `true`, `false`           |
| String  | `"Hello \"user\""`, `'Hey there!'` |
| Number  |    `6`, `-7.2`, `5`, `-3.14159`    |
| Object  |        `{hello: "world!"} `        |
| Array   |       `['hello', 'world!']`        |

## 分组

小括号 `()` 按照你预期的方式使用即可。

| 表达式                                 | 结果     |
|-------------------------------------|:-------|
| `(83 + 1) / 2`                      | `42`   |
| 1 < 3 && (4 > 2 &#124;&#124; 2 > 4) | `true` |

## 标识符

使用变量名访问变量，使用 `.` 或 `[]` 访问对象属性值。

可选链运算符（`?.` `?.[]` `?.()`）在引用为空 (`null` 或者 `undefined`) 的情况下不会引起错误，该表达式短路返回 `undefined`。

示例变量 :

```javascript
const vairables = {
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

| 表达式                 | 结果                |
|---------------------|-------------------|
| `name.first`        | `"Malory"`        |
| `name["first"]`     | `"Malory"`        |
| `name['la' + 'st']` | `"Archer"`        |
| `exes[2]`           | `"Burt Reynolds"` |
| `exes[lastEx - 1]`  | `"Len Trexler"`   |
| `exes[-1]`          | `"Burt Reynolds"` |
| `exes[-2]`          | `"Len Trexler"`   |
| `foo?.bar.baz`      | `undefined`       |

- 关于 `[-1]`:

你可以使用负数在数组或字符串尾部获取元组或字符。如 `a[-1]` 表示最后一个元素或者字符。

## 定义变量

你可以使用 `def` 关键词定义变量，改变量有一个局部作用域，它也可以覆盖通过 `variables` 设置的变量。

| 表达式                                                                         | 结果  |
|-----------------------------------------------------------------------------|-----|
| `def a = 1; def b = a + 1; a + b`                                           | 3   |
| `def a = 1; (true ? (def a = 10; a) : 0) + a`                               | 11  |
| 使用变量: `const variables = { a: 1 }` <br/> `(true ? (def a = 10; a) : 0) + a` | 11  |

## 函数调用

你可以像在 js 中一样调用函数，但是该函数必须定义在 `variables` 中。
比如变量如下：

```javascript
const variables = { foo: 10, fns: { half: (v) => v / 2 } };
```

| 表达式                    | 结果  |
|------------------------|-----|
| `fns.half(foo) + 3`    | 8   |
| `fns["half"](foo) + 3` | 8   |

## 管道

管道是函数调用的语法糖。
形如 `fn(a)` 的函数调用可以简写成 `a|fn` 或者 `a|fn()` 的方式；
形如 `fn(a,b,c)` 的函数调用可以简写成 `a|fn(b,c)` 的方式。
这对多次函数调用非常有帮助，如 `fn3(fn2(fn1(v)))` 可以写成 `v|fn1|fn2|fn3`。

但是需要注意，`v|a.b.c` 等价于 `a(v).b.c` 而不是 `a.b.c(v)`，`a.b.c(v)` 的管道形式是 `v|(a.b.c)`

## 特殊函数注入方式

除了使用 `variables` 的方式注入函数外，还可以使用 `djel.addTransforms` 注入函数，如：

```javascript
djel.addTransforms({
  split: (var, char) => val.split(char),
  lower: (val) => val.toLowerCase(),
});
```

| 表达式                                        | 结果                      |
|--------------------------------------------|-------------------------|
| "Pam Poovey"&#124;lower&#124;split(' ')[1] | `"poovey"`              |
| "password==guest"&#124;split('==')         | `['password', 'guest']` |
| `split("password==guest", '==')`           | `['password', 'guest']` |

## 函数定义

定义函数的形式是 `fn () => expression` 或者 `fn (a, b, c) => expression`。

示例：

```javascript
const variables = {
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

| 表达式                                       | 结果                                   |
|-------------------------------------------|--------------------------------------|
| users&#124;filter(fn(a)=>a.age<18)        | `[{ age: 17, name: "Len Trexler" }]` |
| users&#124;map(fn(a)=>a.age)              | `[18,17,19]`                         |
| users&#124;sum(fn(a)=>a.age)/users.length | `18`                                 |
| `filter(users,fn(a)=>a.age<18)`           | `[{ age: 17, name: "Len Trexler" }]` |
| `map(users,fn(a)=>a.age)`                 | `[18,17,19]`                         |
| `sum(users,fn(a)=>a.age)/users.length`    | `18`                                 |

## 简版函数定义

可以使用 `@` `@0` `@1` ~ `@9` 的特殊标识符来定义一个简版函数。
`@` `@0` 表示第 0 个函数参数，`@1` ~ `@9` 分别表示 第 1 ~ 9 个函数参数。比如：`@.x + @1` 表示 `fn (a, b) => a.x + b`。

示例（变量和注入函数同"函数定义"的示例）：

| 表达式                                | 结果                                   |
|------------------------------------|--------------------------------------|
| users&#124;filter(@.age<18)        | `[{ age: 17, name: "Len Trexler" }]` |
| users&#124;map(@.age)              | `[18,17,19]`                         |
| users&#124;sum(@.age)/users.length | `18`                                 |
| `filter(users,@.age<18)`           | `[{ age: 17, name: "Len Trexler" }]` |
| `map(users,@.age)`                 | `[18,17,19]`                         |
| `sum(users,@.age)/users.length`    | `18`                                 |

## API

### Djel

使用 `Djel` 可以创建一个实例，在这个实例你可以单独注入函数，定义、删除操作符等。

```javascript
const djel = Djel()
```

### evaluate

```typescript
evaluate: (exp: string, variables?: any) => any
```

计算一个表达式，`variables` 是可选的。

### compile

```typescript
compile: (exp: string) => {
  evaluate: (context?: any) => any;
}
```

你可以先编译一个表达式，之后使用编译结果在不同变量上进行求值。如：

```javascript
const expression = djel.compile('a+b');

expression.evaluate({ a: 1, b: 2 }); // => 3
expression.evaluate({ a: 3, b: 4 }); // => 7
```

### addBinaryOps

```typescript
addBinaryOps: (binaryOps: Record<string, {
  priority: number;
  fn: (left: any, right: any) => any;
}>) => void
```

在 `Djel` 实例中添加二元操作符。二元操作符需要考虑其左值和右值，如 `"+"` 或 `"=="`。
`priority` 属性决定了该操作符的优先级。

内置操作符的优先级如下表（见源码 `src/grammar.ts`）：

| 优先级 |                 符合                  | 操作符       |
|:---:|:-----------------------------------:|-----------|
| 10  |          &#124;&#124; `??`          | 逻辑或，空值合并  |
| 20  |                `&&`                 | 逻辑与       |
| 30  |             `==`  `!=`              | 相等        |
| 40  |       `<=` `<` `>=` `>` `in`        | 比较        |
| 50  |               `+` `-`               | 加、拼接、减    |
| 60  |          `*` `/` `//` `%`           | 乘、除、整除、取余 |
| 70  |                 `^`                 | 指数        |
| 80  |               &#124;                | 管道        |
| 90  |             `!` `+` `-`             | 一元操作符     |
| 100 |  `[]` `.` `()` `?.[]` `?.` `?.()`   | 属性访问，函数调用 |

### addUnaryOps

```typescript
addUnaryOps: (unaryOps: Record<string, {
  priority: number;
  fn: (left: any) => any;
}>) => void
```

在 `Djel` 实例中添加一元操作符。一元操作符只需要考虑其右值，如 `"!"`。
`priority` 属性决定了该操作符的优先级。

### addTransforms

```typescript
addTransforms: (transforms: Record<string, Function>) => void
```

在 `Djel` 实例中注入函数。

### removeOp

```typescript
removeOp: (operator: string) => void
```

在 `Djel` 实例中移除操作符。如 `djel.removeOp('^')` 可以移除指数操作符。

### removeTransform

```typescript
removeTransform: (transformName: string) => void
```

在 `Djel` 实例中移除注入的函数。

## License

`Djel` is licensed under the MIT license. Please see `LICENSE.txt` for full
details.
