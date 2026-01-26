// Scientific calculator UI with angle mode toggle and worker-backed evaluation.
const BUTTONS = [
  { label: 'AC', action: 'clearAll', class: 'func' },
  { label: 'DEL', action: 'delete', class: 'func' },
  { label: '(', action: 'insert', value: '(' },
  { label: ')', action: 'insert', value: ')' },
  { label: '÷', action: 'insert', value: '/', class: 'op' },

  { label: 'sin', action: 'insert', value: 'sin(', class: 'fn' },
  { label: 'cos', action: 'insert', value: 'cos(', class: 'fn' },
  { label: 'tan', action: 'insert', value: 'tan(', class: 'fn' },
  { label: '^', action: 'insert', value: '^', class: 'op' },
  { label: '√', action: 'insert', value: 'sqrt(', class: 'fn' },

  { label: '7', action: 'insert', value: '7' },
  { label: '8', action: 'insert', value: '8' },
  { label: '9', action: 'insert', value: '9' },
  { label: '×', action: 'insert', value: '*', class: 'op' },
  { label: '!', action: 'insert', value: '!', class: 'fn' },

  { label: '4', action: 'insert', value: '4' },
  { label: '5', action: 'insert', value: '5' },
  { label: '6', action: 'insert', value: '6' },
  { label: '−', action: 'insert', value: '-', class: 'op' },
  { label: 'log', action: 'insert', value: 'log10(', class: 'fn' },

  { label: '1', action: 'insert', value: '1' },
  { label: '2', action: 'insert', value: '2' },
  { label: '3', action: 'insert', value: '3' },
  { label: '+', action: 'insert', value: '+', class: 'op' },
  { label: 'ln', action: 'insert', value: 'log(', class: 'fn' },

  { label: '0', action: 'insert', value: '0' },
  { label: '.', action: 'insert', value: '.' },
  { label: 'π', action: 'insert', value: 'pi' },
  { label: 'e', action: 'insert', value: 'e' },
  { label: '=', action: 'eval', class: 'equal' }
];

import { evaluate as localEvaluate } from './math/engine.js';

export function initUI(worker) {
  const app = document.getElementById('app');

  // State
  let expr = '';
  let lastResult = '0';
  let angleMode = 'rad'; // 'rad' | 'deg'

  // Header with mode toggle
  const header = document.createElement('div');
  header.className = 'header';

  const modeBtn = document.createElement('button');
  modeBtn.className = 'mode-btn';
  modeBtn.type = 'button';
  modeBtn.textContent = 'RAD';
  modeBtn.setAttribute('aria-label', 'Toggle angle mode');
  modeBtn.addEventListener('click', () => {
    angleMode = angleMode === 'rad' ? 'deg' : 'rad';
    modeBtn.textContent = angleMode.toUpperCase();
  });

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'Scientific Calculator • High Precision';

  header.appendChild(modeBtn);
  header.appendChild(hint);

  // Display
  const display = document.createElement('div');
  display.className = 'display';

  const exprLine = document.createElement('div');
  exprLine.className = 'expr-line';
  exprLine.textContent = '';

  const resultLine = document.createElement('div');
  resultLine.className = 'result-line';
  resultLine.setAttribute('role', 'status');
  resultLine.setAttribute('aria-live', 'polite');
  resultLine.textContent = '0';

  display.appendChild(exprLine);
  display.appendChild(resultLine);

  // Keypad
  const keypad = document.createElement('div');
  keypad.className = 'keypad';

  BUTTONS.forEach(btnCfg => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    if (btnCfg.class) btn.classList.add(btnCfg.class);
    btn.textContent = btnCfg.label;
    btn.setAttribute('aria-label', btnCfg.label);
    btn.addEventListener('click', () => handleAction(btnCfg));
    keypad.appendChild(btn);
  });

  app.innerHTML = '';
  app.appendChild(header);
  app.appendChild(display);
  app.appendChild(keypad);

  function updateDisplay(pending = false) {
    exprLine.textContent = expr || '';
    if (pending) resultLine.textContent = '…';
  }

  function insert(val) {
    expr += val;
    updateDisplay();
  }

  function clearAll() {
    expr = '';
    updateDisplay();
    resultLine.textContent = '0';
  }

  function deleteLast() {
    expr = expr.slice(0, -1);
    updateDisplay();
  }

  function handleAction(btn) {
    if (btn.action === 'insert') return insert(btn.value);
    if (btn.action === 'clearAll') return clearAll();
    if (btn.action === 'delete') return deleteLast();
    if (btn.action === 'eval') return evaluate();
  }

  async function evaluate() {
    if (!expr.trim()) return;
    updateDisplay(true);

    // Try worker first; if it fails (worker missing or messaging error), fall back
    // to local evaluation so the '=' button remains responsive.
    const payload = { id: Math.random().toString(36).slice(2), type: 'eval', expression: expr, mode: angleMode };
    if (worker && typeof worker.postMessage === 'function') {
      try {
        worker.postMessage(payload);
        return;
      } catch (err) {
        // continue to local evaluation
        console.warn('Worker postMessage failed, falling back to local eval', err);
      }
    }

    try {
      const res = await localEvaluate(expr, angleMode);
      if (res.ok) {
        lastResult = String(res.result);
        resultLine.textContent = lastResult;
      } else {
        resultLine.textContent = `Error: ${res.error || 'invalid'}`;
      }
    } catch (err) {
      resultLine.textContent = `Error: ${err.message || 'invalid'}`;
    }
    expr = '';
    exprLine.textContent = '';
  }

  worker.addEventListener('message', ev => {
    const { ok, result, error } = ev.data || {};
    if (ok) {
      lastResult = String(result);
      resultLine.textContent = lastResult;
    } else {
      resultLine.textContent = `Error: ${error || 'invalid'}`;
    }
    expr = '';
    exprLine.textContent = '';
  });

  // Keyboard support
  window.addEventListener('keydown', e => {
    if ((e.key >= '0' && e.key <= '9') || ['+','-','*','/','.','^','(',')','!'].includes(e.key)) {
      insert(e.key);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      evaluate();
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      deleteLast();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      clearAll();
    }
  });

  // Initial paint
  updateDisplay();
}
