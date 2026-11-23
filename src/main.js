import './style.css';
import {
  TUTORIAL_ITEMS,
  PRACTICE_TASKS,
  generateRandomNotebookTask,
  pluralCubes,
  pluralCells,
  pluralDiags,
} from './data/tasks.js';
import { NotebookSheetController, getStepCaption } from './ui/notebookCanvas.js';

// Auto-enable fast GPU compositing on 4K interactive touchboards & low-core school OPS PCs
if (
  (window.screen.width >= 2400 && (navigator.maxTouchPoints || 0) > 0) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
) {
  document.body.classList.add('perf-lite');
}

// ==================== APP STATE ====================
const state = {
  tab: 'tutorial', // 'tutorial' | 'tasks' | 'random'
  showTasksBoard: false, // When true, ALL 30 tasks fill the entire board at once (zero scrolling!)
  taskFilter: 'all', // 'all' | 'easy' | 'medium' | 'hard'
  itemId: TUTORIAL_ITEMS[0].id,
  randomItem: generateRandomNotebookTask(),

  theme: 'light',
  zen: false,
  leftCollapsed: false,
  rightCollapsed: false,

  step: 5, // 0..5
  playing: false,
  playTimer: null,
  drawMode: false,
  drawDashed: false,
  showDimLabels: true,
  showHidden: true,
  highlightDim: null, // 'length' | 'width' | 'height' | null

  revealed: new Set(TUTORIAL_ITEMS.map((t) => t.id)),
  hintsOpen: new Set(),
};

// ==================== DOM ELEMENTS ====================
const topBarEl = document.getElementById('top-bar');
const stageEl = document.getElementById('notebook-stage');
const tasksBoardEl = document.getElementById('tasks-board');
const btnBackBoard = document.getElementById('btn-back-board');
const leftRailEl = document.getElementById('left-rail');
const rightPanelEl = document.getElementById('right-panel');
const btnOpenLeft = document.getElementById('btn-open-left');
const btnOpenRight = document.getElementById('btn-open-right');
const mobileBackdropEl = document.getElementById('mobile-backdrop');
const btnMobileMenu = document.getElementById('btn-mobile-menu');
const btnMobileInfo = document.getElementById('btn-mobile-info');

const railBadgeEl = document.getElementById('rail-badge');
const railTitleEl = document.getElementById('rail-title');
const taskFilterBarEl = document.getElementById('task-filter-bar');
const itemListEl = document.getElementById('item-list');
const panelBadgeEl = document.getElementById('panel-badge');
const rightBodyEl = document.getElementById('right-body');

const btnPlay = document.getElementById('btn-play');
const btnDraw = document.getElementById('btn-draw');
const btnDashPen = document.getElementById('btn-dash-pen');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const btnDims = document.getElementById('btn-dims');
const btnHidden = document.getElementById('btn-hidden');
const btnAnswer = document.getElementById('btn-answer');

const btnTheme = document.getElementById('btn-theme');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');
const btnZen = document.getElementById('btn-zen');
const zenBarEl = document.getElementById('zen-bar');
const zenPlayBtn = document.getElementById('zen-play');
const zenAnswerBtn = document.getElementById('zen-answer');
const btnFullscreen = document.getElementById('btn-fullscreen');
const toastEl = document.getElementById('toast');

const notebook = new NotebookSheetController(stageEl, () => {
  renderStage();
  renderDock();
});

// ==================== HELPERS ====================
let toastTimer = null;
function showToast(text, tone = '') {
  toastEl.textContent = text;
  toastEl.className = `toast ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2800);
}

function isMobileViewport() {
  return window.innerWidth <= 820;
}

function stopPlayTimer() {
  if (state.playTimer) {
    clearInterval(state.playTimer);
    state.playTimer = null;
  }
  state.playing = false;
}

function getVisibleList() {
  if (state.tab === 'tutorial') return TUTORIAL_ITEMS;
  if (state.tab === 'random') return [state.randomItem];
  if (state.taskFilter === 'all') return PRACTICE_TASKS;
  return PRACTICE_TASKS.filter((t) => t.level === state.taskFilter);
}

function getActiveItem() {
  if (state.tab === 'random') return state.randomItem;
  const all = state.tab === 'tutorial' ? TUTORIAL_ITEMS : PRACTICE_TASKS;
  return all.find((x) => x.id === state.itemId) || all[0];
}

// ==================== NAVIGATION ====================
function selectTab(tab) {
  stopPlayTimer();
  state.tab = tab;
  if (tab === 'tutorial') {
    state.showTasksBoard = false;
    selectItem(TUTORIAL_ITEMS[0].id);
  } else if (tab === 'tasks') {
    // Open ALL 30 tasks across the entire board immediately — zero scrolling!
    state.showTasksBoard = true;
    closeMobileDrawers();
    renderAll();
  } else if (tab === 'random') {
    state.showTasksBoard = false;
    selectItem(state.randomItem.id);
  }
}

function openTasksBoard() {
  stopPlayTimer();
  state.tab = 'tasks';
  state.showTasksBoard = true;
  closeMobileDrawers();
  renderAll();
}

function selectItem(id) {
  stopPlayTimer();
  state.showTasksBoard = false;
  state.itemId = id;
  state.highlightDim = null;
  state.drawMode = false;
  notebook.setDrawMode(false);
  notebook.clearDrawings();

  const item = getActiveItem();
  const isRev = state.revealed.has(item.id);
  state.step = isRev ? 5 : 0;

  renderAll();
}

function stepItem(delta) {
  if (state.tab === 'random') {
    generateNewRandom();
    return;
  }
  const list = getVisibleList();
  const idx = list.findIndex((i) => i.id === state.itemId);
  if (idx < 0) return;
  const next = (idx + delta + list.length) % list.length;
  selectItem(list[next].id);
}

function generateNewRandom() {
  stopPlayTimer();
  state.randomItem = generateRandomNotebookTask();
  state.revealed.delete(state.randomItem.id);
  state.hintsOpen.delete(state.randomItem.id);
  state.highlightDim = null;
  state.drawMode = false;
  notebook.setDrawMode(false);
  notebook.clearDrawings();
  state.step = 0;
  state.itemId = state.randomItem.id;
  showToast('🎲 Новая случайная задача готова! Переведи единицы в клетки (1 ед. = 2 кл.)');
  renderAll();
}

// ==================== STEP-BY-STEP & ANSWER CONTROLS ====================
function setStep(s) {
  const item = getActiveItem();
  stopPlayTimer();
  state.step = Math.max(0, Math.min(5, s));
  if (state.step > 0) {
    state.revealed.add(item.id);
  } else if (item.hideAnswerByDefault) {
    state.revealed.delete(item.id);
  }
  renderAll();
}

function togglePlay() {
  const item = getActiveItem();
  if (state.playing) {
    stopPlayTimer();
    renderDock();
    renderRightPanel();
    return;
  }

  if (state.drawMode) {
    state.drawMode = false;
    notebook.setDrawMode(false);
  }

  state.revealed.add(item.id);
  state.step = 1;
  state.playing = true;
  renderAll();

  state.playTimer = setInterval(() => {
    if (state.step >= 5) {
      stopPlayTimer();
      renderDock();
      renderRightPanel();
      return;
    }
    state.step += 1;
    renderStage();
    renderDock();
    renderRightPanel();
    if (state.step >= 5) {
      stopPlayTimer();
      renderDock();
      renderRightPanel();
    }
  }, 1450);
}

function toggleAnswer() {
  const item = getActiveItem();
  stopPlayTimer();
  if (state.revealed.has(item.id)) {
    state.revealed.delete(item.id);
    state.step = 0;
  } else {
    state.revealed.add(item.id);
    state.step = 5;
  }
  renderAll();
}

function toggleDrawMode() {
  stopPlayTimer();
  state.drawMode = !state.drawMode;
  notebook.setDrawMode(state.drawMode);
  if (state.drawMode) {
    showToast('✏️ Тяни от узла к узлу клетки — покажем точную длину в клетках!');
  }
  renderStage();
  renderDock();
  renderRightPanel();
}

// ==================== RENDERING ====================
function renderAll() {
  document.body.classList.toggle('board-open', state.showTasksBoard);
  tasksBoardEl.classList.toggle('hidden', !state.showTasksBoard);

  renderTopTabs();
  if (state.showTasksBoard) {
    renderTasksBoard();
  } else {
    renderLeftRail();
    renderStage();
    renderRightPanel();
    renderDock();
  }
  requestAnimationFrame(updateSafeInsets);
}

function renderTasksBoard() {
  tasksBoardEl.innerHTML = `
    <div class="tasks-board-head">
      <div class="tasks-board-title">
        <span>📝 Все 30 задач для тетради в клетку (нажми на любую задачу, чтобы открыть чертёж)</span>
      </div>
      <div class="tasks-board-legend">
        <span class="legend-pill is-l">↗ Длина (2→ 1↑)</span>
        <span class="legend-pill is-w">↘ Ширина (2→ 1↓)</span>
        <span class="legend-pill is-h">↓ Высота (2 кл.)</span>
      </div>
    </div>
    <div class="tasks-board-grid">
      ${PRACTICE_TASKS.map((t) => {
        const isRev = state.revealed.has(t.id);
        return `
          <button class="tb-card is-${t.level} ${isRev ? 'is-done' : ''}" data-open-task="${t.id}" title="Открыть задачу № ${t.num} на тетрадном листе">
            <div class="tb-card-head">
              <span class="tb-num">
                <span class="tb-num-badge">№ ${t.num}</span>
                <span>${t.isCube ? 'Куб' : 'Кубоид'}</span>
              </span>
              ${isRev ? '<span class="tb-check">✓</span>' : ''}
            </div>
            <div class="tb-dims">
              <div class="tb-dim is-l">
                <span class="tb-dim-lbl">↗ Длина</span>
                <span class="tb-dim-val">${t.L} ед.</span>
              </div>
              <div class="tb-dim is-w">
                <span class="tb-dim-lbl">↘ Ширина</span>
                <span class="tb-dim-val">${t.W} ед.</span>
              </div>
              <div class="tb-dim is-h">
                <span class="tb-dim-lbl">↕ Высота</span>
                <span class="tb-dim-val">${t.H} ед.</span>
              </div>
            </div>
          </button>
        `;
      }).join('')}
    </div>
  `;

  tasksBoardEl.querySelectorAll('[data-open-task]').forEach((card) => {
    card.addEventListener('click', () => {
      selectItem(card.dataset.openTask);
    });
  });
}

function renderTopTabs() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  });
}

function renderLeftRail() {
  const isTasks = state.tab === 'tasks';
  const isRand = state.tab === 'random';

  taskFilterBarEl.classList.toggle('hidden', !isTasks);
  if (state.tab === 'tutorial') {
    railBadgeEl.textContent = 'Обучение · 5 уроков';
    railTitleEl.textContent = 'Как строить в тетради';
  } else if (isTasks) {
    railBadgeEl.textContent = 'Практика · 30 задач';
    railTitleEl.textContent = 'Задания в единицах';
  } else {
    railBadgeEl.textContent = 'Генератор';
    railTitleEl.textContent = 'Случайная задача';
  }

  taskFilterBarEl.querySelectorAll('.filter-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.filter === state.taskFilter);
  });

  const list = getVisibleList();
  itemListEl.innerHTML = list
    .map((item) => {
      const active = item.id === state.itemId ? 'active' : '';
      const isRev = state.revealed.has(item.id);
      const statusText =
        state.tab === 'tutorial'
          ? 'Урок'
          : isRev
            ? '✓ Показано'
            : 'Скрыто';

      return `
        <button class="item-card ${active}" data-item="${item.id}">
          <div class="item-card-top">
            <span class="item-card-name">${item.shortLabel}</span>
            <span class="item-card-status ${isRev && isTasks ? 'is-done' : ''}">${statusText}</span>
          </div>
          <div class="mini-dims-row">
            <span class="mini-dim is-l">↗ Д: ${item.L}</span>
            <span class="mini-dim is-w">↘ Ш: ${item.W}</span>
            <span class="mini-dim is-h">↕ В: ${item.H}</span>
          </div>
        </button>
      `;
    })
    .join('');

  itemListEl.querySelectorAll('.item-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectItem(btn.dataset.item);
      if (isMobileViewport()) closeMobileDrawers();
    });
  });
}

function renderStage() {
  const item = getActiveItem();
  notebook.render(item, {
    theme: state.theme,
    step: state.step,
    revealed: state.revealed.has(item.id),
    showHidden: state.showHidden,
    showDimLabels: state.showDimLabels,
    showCellTicks: true,
    highlightDim: state.highlightDim,
  });
}

function renderRightPanel() {
  const item = getActiveItem();
  const isRev = state.revealed.has(item.id);
  const shownStep = isRev ? state.step : 0;
  const hintOpen = state.hintsOpen.has(item.id);
  const vol = item.L * item.W * item.H;
  const hl = state.highlightDim;

  panelBadgeEl.textContent = item.badge;

  let html = `<h2 class="card-title">${item.title}</h2>`;
  html += `<p class="card-desc">${item.description}</p>`;

  // 3 SIGNATURE COLOR-CODED DIMENSION CARDS (EXACTLY LIKE USER'S SCREENSHOT 1!)
  html += `
    <div class="dim-cards-wrap">
      <div class="dim-cards">
        <button class="dim-card is-length ${hl === 'length' ? 'is-active' : ''}" data-hl="length" title="Нажми, чтобы подсветить Длину (↗) на тетрадном листе">
          <span class="dim-card-lbl">↗ Длина</span>
          <span class="dim-card-val">${item.L} ед.</span>
          <span class="dim-card-sub">${item.L * 2}→ ${item.L}↑ кл.</span>
        </button>
        <button class="dim-card is-width ${hl === 'width' ? 'is-active' : ''}" data-hl="width" title="Нажми, чтобы подсветить Ширину (↘) на тетрадном листе">
          <span class="dim-card-lbl">↘ Ширина</span>
          <span class="dim-card-val">${item.W} ед.</span>
          <span class="dim-card-sub">${item.W * 2}→ ${item.W}↓ кл.</span>
        </button>
        <button class="dim-card is-height ${hl === 'height' ? 'is-active' : ''}" data-hl="height" title="Нажми, чтобы подсветить Высоту (↕) на тетрадном листе">
          <span class="dim-card-lbl">↕ Высота</span>
          <span class="dim-card-val">${item.H} ед.</span>
          <span class="dim-card-sub">${pluralCells(item.H * 2)}</span>
        </button>
      </div>
      <div class="dim-cards-hint">👆 Нажми на <strong>Длину</strong>, <strong>Ширину</strong> или <strong>Высоту</strong> — подсветим эти рёбра!</div>
    </div>
  `;

  if (state.tab === 'random') {
    html += `<button id="btn-new-random" class="btn-action primary full">🎲 Новая случайная задача</button>`;
  }

  html += `<div class="callout-box">📏 ${item.callout}</div>`;

  // Step-by-step teaching box
  html += `
    <div class="box-card">
      <div class="box-label">Пошаговое построение в тетради (5 шагов)</div>
      <div style="font-size:12px;font-weight:700;line-height:1.4;color:var(--text-muted)">${getStepCaption(shownStep)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button id="panel-play" class="btn-action primary">${state.playing ? '⏸ Пауза' : '▶ Пошагово'}</button>
        <button id="panel-draw" class="btn-action ${state.drawMode ? 'primary' : ''}">✏️ Рисовать</button>
      </div>
      <div class="step-pills">
        ${[0, 1, 2, 3, 4, 5]
          .map(
            (s) =>
              `<button class="step-pill ${shownStep === s ? 'active' : ''}" data-pstep="${s}">${
                s === 0 ? 'Лист' : s
              }</button>`
          )
          .join('')}
      </div>
    </div>
  `;

  // Answer / Volume block (strictly hidden on all 30 tasks & random until clicked!)
  if (isRev) {
    html += `
      <div class="answer-card">
        <div class="box-label" style="color:var(--success)">✅ Чертёж показан · Объём фигуры</div>
        <div class="answer-big">${pluralCubes(vol)}</div>
        <div class="answer-formula">${item.L} × ${item.W} × ${item.H} = ${vol} куб. ед.</div>
      </div>
      <button id="panel-toggle-answer" class="btn-action full">🙈 Скрыть чертёж-ответ</button>
    `;
  } else {
    html += `
      <button id="panel-toggle-answer" class="btn-action success full">👁 Показать чертёж-ответ в клетках</button>
    `;
  }

  if (item.tip) {
    html += `<button id="panel-hint" class="hint-btn">${
      hintOpen ? '▾ Скрыть подсказку' : '💡 Показать подсказку для тетради'
    }</button>`;
    if (hintOpen) {
      html += `<div class="hint-text">${item.tip}</div>`;
    }
  }

  rightBodyEl.innerHTML = html;

  // Bind right panel buttons
  rightBodyEl.querySelectorAll('[data-hl]').forEach((btn) => {
    btn.onclick = () => {
      const dim = btn.dataset.hl;
      state.highlightDim = state.highlightDim === dim ? null : dim;
      if (state.highlightDim) state.showDimLabels = true;
      renderStage();
      renderDock();
      renderRightPanel();
      if (isMobileViewport() && state.highlightDim) closeMobileDrawers();
    };
  });

  const randBtn = document.getElementById('btn-new-random');
  if (randBtn) {
    randBtn.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      generateNewRandom();
    };
  }

  document.getElementById('panel-play').onclick = () => {
    if (isMobileViewport()) closeMobileDrawers();
    togglePlay();
  };
  document.getElementById('panel-draw').onclick = () => {
    if (isMobileViewport()) closeMobileDrawers();
    toggleDrawMode();
  };
  rightBodyEl.querySelectorAll('[data-pstep]').forEach((b) => {
    b.onclick = () => {
      if (isMobileViewport()) closeMobileDrawers();
      setStep(Number(b.dataset.pstep));
    };
  });
  document.getElementById('panel-toggle-answer').onclick = () => {
    toggleAnswer();
    if (isMobileViewport()) closeMobileDrawers();
  };
  const hintBtn = document.getElementById('panel-hint');
  if (hintBtn) {
    hintBtn.onclick = () => {
      if (state.hintsOpen.has(item.id)) state.hintsOpen.delete(item.id);
      else state.hintsOpen.add(item.id);
      renderRightPanel();
    };
  }
}

function renderDock() {
  const item = getActiveItem();
  const isRev = state.revealed.has(item.id);
  const shownStep = isRev ? state.step : 0;

  btnPlay.textContent = state.playing ? '⏸ Пауза' : '▶ Пошагово';
  zenPlayBtn.textContent = state.playing ? '⏸ Пауза' : '▶ Пошагово';

  document.querySelectorAll('.step-btn').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.step) === shownStep);
  });

  btnDraw.classList.toggle('active', state.drawMode);
  btnDashPen.classList.toggle('hidden', !state.drawMode);
  btnDashPen.classList.toggle('active', state.drawDashed);
  btnDashPen.textContent = state.drawDashed ? '┄ Пунктир' : '— Сплошная';

  const hasLines = notebook.hasUserLines();
  btnUndo.classList.toggle('hidden', !hasLines);
  btnClear.classList.toggle('hidden', !hasLines);

  btnDims.classList.toggle('active', state.showDimLabels);
  btnHidden.classList.toggle('active', state.showHidden);
  btnBackBoard?.classList.toggle('hidden', state.tab !== 'tasks');

  [btnAnswer, zenAnswerBtn].forEach((b) => {
    b.classList.toggle('is-revealed', isRev);
    b.textContent = isRev ? '🙈 Скрыть' : '👁 Ответ';
  });
}

// ==================== SAFE INSETS & MOBILE DRAWERS ====================
function closeMobileDrawers() {
  leftRailEl.classList.remove('mobile-open');
  rightPanelEl.classList.remove('mobile-open');
  mobileBackdropEl.classList.add('hidden');
  btnMobileMenu?.classList.remove('active');
  btnMobileInfo?.classList.remove('active');
}

function openMobileDrawer(side) {
  const target = side === 'left' ? leftRailEl : rightPanelEl;
  const already = target.classList.contains('mobile-open');
  closeMobileDrawers();
  if (!already) {
    target.classList.add('mobile-open');
    mobileBackdropEl.classList.remove('hidden');
    if (side === 'left') btnMobileMenu?.classList.add('active');
    else btnMobileInfo?.classList.add('active');
  }
}

function updateSafeInsets() {
  let top = 72;
  let left = 274;
  let right = 360;
  let bottom = 84;

  if (isMobileViewport()) {
    const rect = topBarEl?.getBoundingClientRect();
    top = Math.ceil((rect ? rect.bottom : 112) + 8);
    document.documentElement.style.setProperty('--mobile-top-offset', `${top}px`);
    left = 8;
    right = 8;
    bottom = 78;
  } else if (state.zen) {
    top = 60;
    left = 20;
    right = 20;
    bottom = 82;
  } else {
    left = state.leftCollapsed ? 20 : (leftRailEl.offsetWidth || 248) + 26;
    right = state.rightCollapsed ? 20 : (rightPanelEl.offsetWidth || 334) + 26;
  }

  stageEl.style.setProperty('--safe-top', `${top}px`);
  stageEl.style.setProperty('--safe-left', `${left}px`);
  stageEl.style.setProperty('--safe-right', `${right}px`);
  stageEl.style.setProperty('--safe-bottom', `${bottom}px`);
}

// ==================== EVENT BINDINGS ====================
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => selectTab(btn.dataset.tab));
});

taskFilterBarEl.querySelectorAll('.filter-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.taskFilter = btn.dataset.filter;
    const list = getVisibleList();
    if (!list.some((i) => i.id === state.itemId) && list.length > 0) {
      selectItem(list[0].id);
    } else {
      renderLeftRail();
    }
  });
});

document.getElementById('btn-prev').addEventListener('click', () => stepItem(-1));
document.getElementById('btn-next').addEventListener('click', () => stepItem(1));
document.getElementById('zen-prev').addEventListener('click', () => stepItem(-1));
document.getElementById('zen-next').addEventListener('click', () => stepItem(1));

btnPlay.addEventListener('click', togglePlay);
zenPlayBtn.addEventListener('click', togglePlay);
document.querySelectorAll('.step-btn').forEach((b) => {
  b.addEventListener('click', () => setStep(Number(b.dataset.step)));
});

btnDraw.addEventListener('click', toggleDrawMode);
btnDashPen.addEventListener('click', () => {
  state.drawDashed = !state.drawDashed;
  notebook.setDrawDashed(state.drawDashed);
  renderStage();
  renderDock();
});
btnUndo.addEventListener('click', () => {
  if (notebook.undoLastLine()) {
    renderStage();
    renderDock();
  }
});
btnClear.addEventListener('click', () => {
  notebook.clearDrawings();
  renderStage();
  renderDock();
});
btnDims.addEventListener('click', () => {
  state.showDimLabels = !state.showDimLabels;
  if (!state.showDimLabels) state.highlightDim = null;
  renderStage();
  renderDock();
  renderRightPanel();
});
btnHidden.addEventListener('click', () => {
  state.showHidden = !state.showHidden;
  renderStage();
  renderDock();
});
btnAnswer.addEventListener('click', toggleAnswer);
zenAnswerBtn.addEventListener('click', toggleAnswer);
btnBackBoard?.addEventListener('click', openTasksBoard);

// Theme
btnTheme.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = state.theme;
  themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  themeLabel.textContent = state.theme === 'dark' ? 'Тетрадь' : 'Чертёж';
  renderStage();
});

// Zen Mode
function toggleZen(force) {
  state.zen = typeof force === 'boolean' ? force : !state.zen;
  document.body.classList.toggle('zen-mode', state.zen);
  zenBarEl.classList.toggle('hidden', !state.zen);
  btnZen.classList.toggle('active', state.zen);
  updateSafeInsets();
}
btnZen.addEventListener('click', () => toggleZen());
document.getElementById('btn-exit-zen').addEventListener('click', () => toggleZen(false));

// Fullscreen
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

// Collapse panels / Mobile drawers
document.getElementById('btn-toggle-left').addEventListener('click', () => {
  if (isMobileViewport()) return closeMobileDrawers();
  state.leftCollapsed = true;
  leftRailEl.classList.add('collapsed');
  btnOpenLeft.classList.remove('hidden');
  updateSafeInsets();
});
btnOpenLeft.addEventListener('click', () => {
  state.leftCollapsed = false;
  leftRailEl.classList.remove('collapsed');
  btnOpenLeft.classList.add('hidden');
  updateSafeInsets();
});
document.getElementById('btn-toggle-right').addEventListener('click', () => {
  if (isMobileViewport()) return closeMobileDrawers();
  state.rightCollapsed = true;
  rightPanelEl.classList.add('collapsed');
  btnOpenRight.classList.remove('hidden');
  updateSafeInsets();
});
btnOpenRight.addEventListener('click', () => {
  state.rightCollapsed = false;
  rightPanelEl.classList.remove('collapsed');
  btnOpenRight.classList.add('hidden');
  updateSafeInsets();
});

btnMobileMenu?.addEventListener('click', () => openMobileDrawer('left'));
btnMobileInfo?.addEventListener('click', () => openMobileDrawer('right'));
mobileBackdropEl?.addEventListener('click', closeMobileDrawers);

let resizeT = null;
window.addEventListener('resize', () => {
  if (!isMobileViewport()) closeMobileDrawers();
  updateSafeInsets();
  clearTimeout(resizeT);
  resizeT = setTimeout(updateSafeInsets, 100);
});

// Keyboard shortcuts for teacher clicker
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    toggleAnswer();
  } else if (e.key === 'ArrowRight') stepItem(1);
  else if (e.key === 'ArrowLeft') stepItem(-1);
  else if (k === 'z') toggleZen();
  else if (k === 'f') btnFullscreen.click();
  else if (e.key === 'Escape') {
    if (state.drawMode) toggleDrawMode();
    else if (state.zen) toggleZen(false);
    else if (state.tab === 'tasks' && !state.showTasksBoard) openTasksBoard();
  }
});

// ==================== BOOT ====================
selectItem(TUTORIAL_ITEMS[0].id);
