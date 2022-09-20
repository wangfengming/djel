import type { Grammar, Token } from './types';

/**
 * Tokenizer is a collection of stateless, statically-accessed functions for the
 * lexical parsing of a string. Its responsibility is to identify the
 * "parts of speech" of an expression, and tokenize and label each, but
 * to do only the most minimal syntax checking; the only errors the Lexer
 * should be concerned with are if it's unable to identify the utility of
 * its tokens. Errors stemming from these tokens not being in a
 * sensible configuration should be left for the Parser to handle.
 *
 * @param grammar grammar map object of symbols, unary operators and binary operators
 */
export function Tokenizer(grammar: Omit<Grammar, 'transforms'>) {
  let _grammar = grammar;
  let _regexp: RegExp | undefined;

  /**
   * Splits an expression string into an array of expression elements.
   * @param {string} str A expression string
   * @returns {string[]} An array of substrings defining the functional
   *      elements of the expression.
   */
  function getElements(str: string) {
    if (!_regexp) {
      const tokenNames = Object.keys(_grammar.symbols)
        .concat(Object.keys(_grammar.binaryOps))
        .concat(Object.keys(_grammar.unaryOps));
      _regexp = createRegexp(tokenNames);
    }
    const elements = str.split(_regexp).filter((i) => i);
    return elements;
  }

  /**
   * Converts an array of expression elements into an array of tokens.
   * The resulting array may not equal the element array in length, as any
   * elements that consist only of whitespace get appended to the previous
   * token's "raw" property.
   * @param {string[]} elements An array of expression elements to be
   *      converted to tokens
   * @returns an array of token objects.
   */
  function getTokens(elements: string[]) {
    const tokens: Token[] = [];

    elements.forEach((element) => {
      if (/^\s*$/.test(element)) { // is whitespace
        if (tokens.length) tokens[tokens.length - 1].raw += element;
      } else if (element.startsWith('#')) { // is comment
        return;
      } else {
        const token = createToken(element, _grammar, isPreferUnaryOp(tokens));
        tokens.push(token);
      }
    });

    return tokens;
  }

  /**
   * Converts a string into an array of tokens. Each token is an object
   * in the following format:
   *
   *     {
   *         type: <string>,
   *         value: <boolean|number|string>,
   *         raw: <string>
   *     }
   *
   * Type is one of the following:
   *
   *      literal, identifier, binaryOp, unaryOp
   *
   * OR, if the token is a control character its type is the name of the element
   * defined in the Grammar.
   *
   * Value is the value of the token in the correct type (boolean or numeric as
   * appropriate). Raw is the string representation of this value taken directly
   * from the expression string, including any trailing spaces.
   * @param {string} str The string to be tokenized
   * @returns an array of token objects.
   * @throws {Error} if the provided string contains an invalid token.
   */
  const tokenize = (str: string) => {
    const elements = getElements(str);
    const tokens = getTokens(elements);
    return tokens;
  };

  /**
   * update grammar when add/remove operators or transforms
   * @param newGrammar new grammar object
   */
  const updateGrammar = (newGrammar: Omit<Grammar, 'transforms'>) => {
    _grammar = newGrammar;
    _regexp = undefined;
  };

  return {
    tokenize,
    updateGrammar,
    getElements,
    getTokens,
  };
}

const ID_REGEX = /^[a-zA-Z_$][a-zA-Z\d_$]*$|^@\d?$/;

/**
 * Creates a new token object from an element of a string.
 * @param {string} element The element from which a token should be made
 * @param grammar grammar map object of symbols, unary operators and binary operators
 * @param {boolean} preferUnaryOp operators like `-`, `+` can be both unary and binary.
 *  should treat the operator as unary operator if `preferUnaryOp` is `true`
 * @returns a token object describing the provided element.
 * @throws {Error} if the provided string is not a valid expression element.
 */
function createToken(element: string, grammar: Omit<Grammar, 'transforms'>, preferUnaryOp: boolean) {
  const token: Token = {
    type: 'literal',
    value: element,
    raw: element,
  };

  if (element[0] == '"' || element[0] == '\'') {
    token.value = unquote(element);
  } else if (element.match(/^-?(?:(\d*\.\d+)|\d+)$/)) {
    token.value = parseFloat(element);
  } else if (element === 'true' || element === 'false') {
    token.value = element === 'true';
  } else if (grammar.symbols[element]) {
    token.type = grammar.symbols[element].type;
  } else if (grammar.binaryOps[element] || grammar.unaryOps[element]) {
    token.type = preferUnaryOp && grammar.unaryOps[element] ? 'unaryOp' : 'binaryOp';
  } else if (element.match(ID_REGEX)) {
    token.type = 'identifier';
  } else {
    throw new Error(`Invalid expression token: ${element}`);
  }

  return token;
}

/**
 * Determines whether the `-`/`+`/`!` token should be interpreted as a
 * unary operator, given an array of tokens already processed.
 * @param tokens the tokens already processed.
 * @returns {boolean} true if the token should be interpreted as a unary operator.
 */
function isPreferUnaryOp(tokens: Token[]) {
  if (!tokens.length) return true;
  const lastTokenType = tokens[tokens.length - 1].type;
  return [
    'binaryOp',
    'unaryOp',
    'openParen',
    'openBracket',
    'question',
    'colon',
    'comma',
  ].some((type) => type === lastTokenType);
}

/**
 * Removes the beginning and trailing quotes from a string, unescapes any
 * escaped quotes on its interior, and unescapes any escaped escape characters.
 * Note that this function is not defensive; it assumes that the provided
 * string is not empty, and that its first and last characters are actually
 * quotes.
 * @param {string} str A string whose first and last characters are quotes
 * @returns {string} a string with the surrounding quotes stripped and escapes
 *      properly processed.
 */
function unquote(str: string) {
  const quote = str[0];
  return str
    .substring(1, str.length - 1)
    .replace(new RegExp('\\\\' + quote, 'g'), quote)
    .replace(/\\\\/g, '\\');
}

/**
 * Gets a RegEx object appropriate for splitting a string into its core
 * elements.
 * @param {string[]} tokenNames an array of token names from grammar
 * @returns {RegExp} An element-splitting RegExp object
 */
function createRegexp(tokenNames: string[]) {
  const preOpRegexElems = [
    // Strings
    /'(?:\\'|[^'])*'/.source,
    /"(?:\\"|[^"])*"/.source,
    // Whitespace
    /\s+/.source,
    // Booleans
    /\btrue\b/.source,
    /\bfalse\b/.source,
    // comments
    /#.*\n?/.source,
  ];
  const postOpRegexElems = [
    // Identifiers
    /[a-zA-Z_$][a-zA-Z\d_$]*|@\d?/.source,
    // Numerics (without negative symbol)
    /\d*\.\d+|\d+/.source,
  ];

  const _tokenNames = tokenNames
    .sort((a, b) => b.length - a.length)
    .map((item) => escapeRegExp(item));

  const regexp = new RegExp(
    `(${preOpRegexElems.join('|')}|${_tokenNames.join('|')}|${postOpRegexElems.join('|')})`,
  );

  return regexp;
}

/**
 * Escapes a string so that it can be treated as a string literal within a
 * regular expression.
 * See https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
 * @param {string} str The string to be escaped
 * @returns {string} the RegExp-escaped string.
 */
function escapeRegExp(str: string) {
  let result = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (result.match(ID_REGEX)) result = '\\b' + result + '\\b';
  return result;
}
