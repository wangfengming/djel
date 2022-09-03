import type { GrammarElement, Token } from './types';

export function Tokenizer(grammarElements: Record<string, GrammarElement>) {
  let _grammarElements = grammarElements;
  let _regexp: RegExp | undefined;

  function getElements(str: string) {
    if (!_regexp) _regexp = createRegexp(Object.keys(_grammarElements));
    const elements = str.split(_regexp).filter((i) => i);
    return elements;
  }

  function getTokens(elements: string[]) {
    const tokens: Token[] = [];
    let negate = false;

    elements.forEach((element) => {
      if (/^\s*$/.test(element)) { // is whitespace
        if (tokens.length) tokens[tokens.length - 1].raw += element;
      } else if (element.startsWith('#')) { // is comment
        return;
      } else if (element === '-' && isNegative(tokens)) {
        negate = true;
      } else {
        if (negate) {
          element = `-${element}`;
          negate = false;
        }
        const token = createToken(element, _grammarElements);
        tokens.push(token);
      }
    });

    if (negate) {
      const token = createToken('-', _grammarElements);
      tokens.push(token);
    }

    return tokens;
  }

  const tokenize = (str: string) => {
    if (!_regexp) _regexp = createRegexp(Object.keys(_grammarElements));
    const elements = getElements(str);
    const tokens = getTokens(elements);
    return tokens;
  };

  const updateGrammarElements = (newGrammarElements: Record<string, GrammarElement>) => {
    _grammarElements = newGrammarElements;
    _regexp = undefined;
  };

  return {
    tokenize,
    updateGrammarElements,
    getElements,
    getTokens,
  };
}

const ID_REGEX = /^[a-zA-Z_$][a-zA-Z\d_$]*$|^@\d?$/;

function createToken(element: string, grammar: Record<string, GrammarElement>) {
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
  } else if (grammar[element]) {
    token.type = grammar[element].type;
  } else if (element.match(ID_REGEX)) {
    token.type = 'identifier';
  } else {
    console.warn(`Invalid expression token: ${element}`);
  }

  return token;
}

function isNegative(tokens: Token[]) {
  if (!tokens.length) return true;
  const lastTokenType = tokens[tokens.length - 1].type;
  return [
    'binaryOp',
    'unaryOp',
    'openParen',
    'openBracket',
    'question',
    'colon',
  ].some((type) => type === lastTokenType);
}

function unquote(str: string) {
  const quote = str[0];
  return str
    .substring(1, str.length - 1)
    .replace(new RegExp('\\\\' + quote, 'g'), quote)
    .replace(/\\\\/g, '\\');
}

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
    /\b[a-zA-Z_$][a-zA-Z\d_$]*|@\d?\b/.source,
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

function escapeRegExp(str: string) {
  let result = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (result.match(ID_REGEX)) result = '\\b' + result + '\\b';
  return result;
}
