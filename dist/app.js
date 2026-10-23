import { evaluate, formatNumber, toggleSign, appendInput } from './engine.js';

const $ = (id) => document.getElementById(id);
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Calculation remains available when storage is denied. */ } };
let expression = '', lastExpression = '', calculated = false, hasError = false, currentResult = 0;
let history = readLocal('sakura-history', []);
if (!Array.isArray(history)) history = [];
history = history.filter((item) => item && typeof item.expression === 'string' && item.expression.length <= 500 && typeof item.result === 'number' && Number.isFinite(item.result) && Number.isFinite(item.time)).slice(0,30);
let sound = readLocal('sakura-sound', false) === true;
let petals = readLocal('sakura-petals', true) !== false;
let audioContext, toastTimer;

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}

function playSound() {
  if (!sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + .06);
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .08);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + .08);
  } catch { /* Sound is an optional enhancement. */ }
}

function render() {
  $('display').classList.remove('error');
  const equation = calculated ? `${lastExpression} =` : expression || 'Пусть всё сложится ♡';
  $('expression').textContent = equation;
  $('expression').scrollLeft = $('expression').scrollWidth;
  if (!expression) currentResult = 0;
  else { try { currentResult = evaluate(expression); } catch { /* Keep the last valid preview until input is complete. */ } }
  const result = formatNumber(currentResult);
  $('result').textContent = result;
  $('result').className = result.length > 15 ? 'small' : result.length > 10 ? 'medium' : '';
  $('display-caption').replaceChildren();
  const dot = document.createElement('span'); dot.className = 'tiny-dot';
  $('display-caption').append(dot, calculated ? 'Получилось! Ты умничка ♡' : expression ? 'Предварительный результат' : 'Всё начинается с нуля');
}

function input(value) {
  if (hasError || (calculated && /[\d,(π]/.test(value))) { expression = ''; currentResult = 0; }
  hasError = false;
  calculated = false;
  if (expression.length >= 160) { toast('Выражение уже довольно длинное ♡'); return; }
  expression = appendInput(expression, value);
  render();
}

function showError(message) {
  hasError = true;
  $('display').classList.add('error');
  $('result').className = '';
  $('result').textContent = message;
  $('display-caption').textContent = 'Исправь выражение или начни заново ♡';
}

function commitResult(source, value) {
  lastExpression = source;
  expression = String(value);
  currentResult = value;
  calculated = true;
  hasError = false;
  history.unshift({ expression: source, result: value, time: Date.now() });
  history = history.slice(0,30);
  writeLocal('sakura-history', history);
  render(); renderHistory();
}

function action(name) {
  if (name === 'clear') { expression = ''; currentResult = 0; hasError = false; calculated = false; render(); return; }
  if (name === 'backspace') {
    if (calculated) expression = String(currentResult);
    expression = expression.slice(0,-1); hasError = false; calculated = false; render(); return;
  }
  if (name === 'sign') {
    if (hasError) { expression = ''; hasError = false; currentResult = 0; }
    if (calculated) { expression = String(-currentResult); calculated = false; render(); return; }
    expression = toggleSign(expression);
    render(); return;
  }
  if (!expression || hasError || (name === 'equals' && calculated)) return;
  try {
    const value = evaluate(expression);
    if (name === 'equals') commitResult(expression, value);
    else if (name === 'sqrt') {
      if (value < 0) throw new Error('Нужен ноль или положительное число');
      commitResult(`√(${calculated ? formatNumber(value) : expression})`, Number(Math.sqrt(value).toPrecision(12)));
    } else if (name === 'square') {
      const result = value * value;
      if (!Number.isFinite(result)) throw new Error('Число слишком большое');
      commitResult(`(${calculated ? formatNumber(value) : expression})²`, Number(result.toPrecision(12)));
    } else if (name === 'reciprocal') {
      if (value === 0) throw new Error('На ноль делить нельзя');
      const result = 1/value;
      if (!Number.isFinite(result)) throw new Error('Число слишком большое');
      commitResult(`1/(${calculated ? formatNumber(value) : expression})`, Number(result.toPrecision(12)));
    }
  } catch (error) { showError(error.message); }
}

function renderHistory() {
  $('history-empty').hidden = history.length > 0;
  $('history-list').hidden = history.length === 0;
  $('history-count').hidden = history.length === 0;
  $('history-count').textContent = history.length;
  $('clear-history').disabled = history.length === 0;
  $('history-list').replaceChildren();
  for (const item of history) {
    const button = document.createElement('button');
    button.className = 'history-item';
    button.title = 'Использовать результат';
    const equation = document.createElement('span'); equation.className = 'history-expression'; equation.textContent = item.expression + ' =';
    const result = document.createElement('span'); result.className = 'history-result'; result.textContent = formatNumber(item.result);
    const time = document.createElement('span'); time.className = 'history-time';
    const date = new Date(item.time);
    time.textContent = date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}) : date.toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
    button.append(equation, time, result);
    button.addEventListener('click', () => { expression = String(item.result); currentResult = item.result; lastExpression = item.expression; calculated = true; hasError = false; render(); toast('Результат снова в калькуляторе ♡'); });
    $('history-list').append(button);
  }
}

function updatePreferences() {
  $('sound-toggle').setAttribute('aria-pressed', sound);
  $('sound-toggle').setAttribute('aria-label', sound ? 'Выключить звук' : 'Включить звук');
  $('sound-toggle').classList.toggle('selected', sound);
  $('sound-toggle').querySelector('use').setAttribute('href', sound ? '#i-sound' : '#i-mute');
  $('petals-toggle').setAttribute('aria-pressed', petals);
  $('petals-toggle').classList.toggle('selected', petals);
  $('petals').hidden = !petals;
  $('petals').replaceChildren();
  if (petals && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let index = 0; index < 10; index++) {
      const petal = document.createElement('span'); petal.className = 'petal';
      petal.style.left = `${index*10 + 2}%`;
      petal.style.animationDuration = `${16 + index%5*3}s`;
      petal.style.animationDelay = `${-index*3.7}s`;
      $('petals').append(petal);
    }
  }
}

document.querySelectorAll('[data-input],[data-action]').forEach((button) => {
  button.addEventListener('click', (event) => {
    if (event.detail > 0) button.blur();
    playSound();
    if (button.dataset.input) input(button.dataset.input); else action(button.dataset.action);
  });
});

document.addEventListener('keydown', (event) => {
  if ($('keyboard-dialog').open || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
  const mapping = { '*':'×', '/':'÷', '-':'−', '.':',', 'Enter':'equals', '=':'equals', 'Escape':'clear', 'Backspace':'backspace', 'Delete':'clear' };
  const key = mapping[event.key] ?? event.key;
  if (!/^[0-9+×÷−%,()π]$/.test(key) && !['equals','clear','backspace'].includes(key)) return;
  // Let Enter activate a focused control without also triggering calculation.
  if (event.key === 'Enter' && event.target.closest('button')) return;
  if (event.target.closest('button')) event.target.blur();
  event.preventDefault(); playSound();
  if (['equals','clear','backspace'].includes(key)) action(key); else input(key);
  const button = [...document.querySelectorAll('[data-input],[data-action]')].find((node) => node.dataset.input === key || node.dataset.action === key);
  if (button) { button.classList.add('pressed'); setTimeout(() => button.classList.remove('pressed'), 120); }
});

function setMode(advanced) {
  $('scientific-keys').hidden = !advanced;
  $('advanced-mode').setAttribute('aria-pressed', advanced);
  $('basic-mode').setAttribute('aria-pressed', !advanced);
  $('advanced-mode').classList.toggle('active', advanced);
  $('basic-mode').classList.toggle('active', !advanced);
}
$('basic-mode').addEventListener('click', () => setMode(false));
$('advanced-mode').addEventListener('click', () => setMode(true));
$('sound-toggle').addEventListener('click', () => { sound = !sound; writeLocal('sakura-sound',sound); updatePreferences(); playSound(); toast(sound ? 'Мягкие звуки включены ♪' : 'Тихий режим ♡'); });
$('petals-toggle').addEventListener('click', () => { petals = !petals; writeLocal('sakura-petals',petals); updatePreferences(); });
$('clear-history').addEventListener('click', () => { history = []; writeLocal('sakura-history',history); renderHistory(); toast('Чистая страница для новых открытий'); });
$('copy-button').addEventListener('click', async () => {
  if (hasError) return;
  try {
    await navigator.clipboard.writeText(String(currentResult).replace('.',','));
    toast('Результат скопирован ♡');
  } catch { toast('Копирование недоступно в этом браузере'); }
});
const openHelp = () => $('keyboard-dialog').showModal();
$('help-button').addEventListener('click', openHelp);
$('keyboard-hint').addEventListener('click', openHelp);
$('close-dialog').addEventListener('click', () => $('keyboard-dialog').close());
$('keyboard-dialog').addEventListener('click', (event) => { if (event.target === $('keyboard-dialog')) { const bounds = event.target.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close(); } });

render(); renderHistory(); updatePreferences();
