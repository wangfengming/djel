import type { Grammar, Token } from './types';
import { TokenType } from './types';
import { last } from './utils';

const ID_REGEX = /[a-zA-Z_$][a-zA-Z\d_$]*|@\d?/;

export function Tokenizer(grammar: Omit<Grammar, 'transforms'>) {
  let _grammar = grammar;
  let _regexp: RegExp | undefined;

  const tokenize = (str: string) => {
    if (!_regexp) {
      const tokenNames = Object.keys(_grammar.symbols)
        .concat(Object.keys(_grammar.binaryOps))
        .concat(Object.keys(_grammar.unaryOps));
      _regexp = createRegexp(tokenNames);
    }
    const elements = str.split(_regexp).filter((i) => i);
    const tokens = getTokens(elements, _grammar);
    if (tokens.length && last(tokens).type === TokenType.semi) {
      tokens.pop();
    }
    return tokens;
  };

  const updateGrammar = (newGrammar: Omit<Grammar, 'transforms'>) => {
    _grammar = newGrammar;
    _regexp = undefined;
  };

  return {
    tokenize,
    updateGrammar,
  };
}

function getTokens(elements: string[], grammar: Omit<Grammar, 'transforms'>) {
  const tokens: Token[] = [];

  elements.forEach((element) => {
    if (/^\s*$/.test(element)) { // is whitespace
      if (tokens.length) last(tokens).raw += element;
    } else if (!element.startsWith('#')) {
      // # is comment
      const isPreferUnaryOp = checkIsPreferUnaryOp(tokens);
      const token = createToken(element, grammar, isPreferUnaryOp);
      tokens.push(token);
    }
  });

  return tokens;
}

function createToken(element: string, grammar: Omit<Grammar, 'transforms'>, preferUnaryOp: boolean) {
  const token: Token = {
    type: TokenType.literal,
    value: element,
    raw: element,
  };

  const { symbols, binaryOps, unaryOps } = grammar;

  if (element[0] == '"' || element[0] == '\'') {
    token.literal = unquote(element);
  } else if (element.match(/^(?:(\d*\.\d+)|\d+)$/)) {
    token.literal = parseFloat(element);
  } else if (element === 'true') {
    token.literal = true;
  } else if (element === 'false') {
    token.literal = false;
  } else if (element === 'null') {
    token.literal = null;
  } else if (symbols[element]) {
    token.type = symbols[element].type;
  } else if (binaryOps[element] && unaryOps[element]) {
    token.type = preferUnaryOp ? TokenType.unaryOp : TokenType.binaryOp;
  } else if (binaryOps[element]) {
    token.type = TokenType.binaryOp;
  } else if (unaryOps[element]) {
    token.type = TokenType.unaryOp;
  } else if (element.match(ID_REGEX)) {
    token.type = TokenType.identifier;
    const match = element.match(/^@(\d?)$/);
    if (match) {
      token.argIndex = +match[1] || 0;
    }
  } else {
    throw new Error(`Invalid expression token: ${element}`);
  }

  return token;
}

function checkIsPreferUnaryOp(tokens: Token[]) {
  if (!tokens.length) return true;
  const lastType = last(tokens).type;
  return TokenType.openBracket === lastType
    || TokenType.openParen === lastType
    || TokenType.binaryOp === lastType
    || TokenType.unaryOp === lastType
    || TokenType.question === lastType
    || TokenType.colon === lastType
    || TokenType.comma === lastType
    || TokenType.assign === lastType
    || TokenType.semi === lastType;
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
    // Null
    /\bnull\b/.source,
    // comments
    /#.*\n?/.source,
  ];
  const postOpRegexElems = [
    // Identifiers
    ID_REGEX.source,
    // Numerics (without negative symbol)
    /\d*\.\d+|\d+/.source,
  ];

  const _tokenNames = tokenNames.sort((a, b) => b.length - a.length).map(escapeRegExp);

  const regexp = new RegExp(
    `(${preOpRegexElems.concat(_tokenNames).concat(postOpRegexElems).join('|')})`,
  );

  return regexp;
}

/**
 * 转义正则表达式特殊符号。
 * See https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
 */
function escapeRegExp(str: string) {
  let result = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (result.match(/^[a-zA-Z_$][a-zA-Z\d_$]*$/)) result = '\\b' + result + '\\b';
  return result;
}
