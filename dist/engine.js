/** Parse calculator input without executing JavaScript. Percent is a postfix /100. */
export function evaluate(expression) {
  const source = String(expression).replace(/\s/g, '').replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!source || source.length > 500) throw new Error('Проверь выражение');
  let position = 0;
  function primary() {
    if (source[position] === '+') { position++; return primary(); }
    if (source[position] === '-') { position++; return -primary(); }
    let value;
    if (source[position] === '(') {
      position++;
      value = sum();
      if (source[position++] !== ')') throw new Error('Закрой скобку');
    } else if (source[position] === 'π') {
      position++;
      value = Math.PI;
    } else {
      const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(position));
      if (!match) throw new Error('Проверь выражение');
      position += match[0].length;
      value = Number(match[0]);
    }
    while (source[position] === '%') { position++; value /= 100; }
    return value;
  }
  function product() {
    let value = primary();
    while (source[position] === '*' || source[position] === '/') {
      const operator = source[position++];
      const right = primary();
      if (operator === '/' && right === 0) throw new Error('На ноль делить нельзя');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }
  function sum() {
    let value = product();
    while (source[position] === '+' || source[position] === '-') {
      const operator = source[position++];
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }
  const result = sum();
  if (position !== source.length) throw new Error('Проверь выражение');
  if (!Number.isFinite(result)) throw new Error('Число слишком большое');
  return Number(result.toPrecision(12));
}

export function formatNumber(value) {
  const rounded = Number(Number(value).toPrecision(12));
  if (!Number.isFinite(rounded)) throw new Error('Число слишком большое');
  if (Math.abs(rounded) >= 1e12 || (rounded !== 0 && Math.abs(rounded) < 1e-7)) return rounded.toExponential(11).replace(/\.?(0+)(?=e)/, '').replace('.', ',');
  return new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 12 }).format(Object.is(rounded, -0) ? 0 : rounded).replace(/\u00a0/g, '\u202f');
}

export function toggleSign(expression) {
  const end = expression.replace(/%+$/, '').length;
  let start;
  if (expression[end-1] === ')') {
    let depth = 0;
    for (let index = end-1; index >= 0; index--) {
      if (expression[index] === ')') depth++;
      if (expression[index] === '(' && --depth === 0) { start = index; break; }
    }
  } else {
    const match = expression.slice(0,end).match(/(?:\d+(?:[.,]\d*)?(?:e[+-]?\d+)?|π)$/);
    start = match?.index;
  }
  if (start === undefined) {
    if (/[−-]$/.test(expression) && (expression.length === 1 || /[+×÷*(/−-]/.test(expression.at(-2)))) return expression.slice(0,-1);
    return expression + '−';
  }
  const prefix = expression.slice(0,start);
  const signIsUnary = /[−-]$/.test(prefix) && (prefix.length === 1 || /[+×÷*(/−-]/.test(prefix.at(-2)));
  return signIsUnary ? prefix.slice(0,-1) + expression.slice(start) : prefix + '−' + expression.slice(start);
}

export function appendInput(expression, value) {
  if (value === ',') {
    const current = expression.match(/[\d,.]+$/)?.[0] ?? '';
    if (/[,.]/.test(current)) return expression;
    if (!current) value = '0,';
  }
  if (/[+×÷]/.test(value)) {
    if (!expression) return expression;
    expression = expression.replace(/[+×÷−]+$/, '');
    if (!expression) return expression;
  }
  if (value === '%' && !/[\d)π%]$/.test(expression)) return expression;
  if ((value === '(' || value === 'π') && /[\d)π%]$/.test(expression)) expression += '×';
  if (/^\d/.test(value) && /[)π%]$/.test(expression)) expression += '×';
  return expression + value;
}
