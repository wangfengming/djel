const Djel = require('./lib').default;
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
