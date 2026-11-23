// Изометрическое построение на школьном тетрадном листе в клетку (масштаб: 1 единица = 2 клетки!)
// 🔵 ↗ Длина (L): 1 ед. = 2 клетки вправо и 1 клетка вверх  (dx = +2, dy = -1)
// 🟠 ↘ Ширина (W): 1 ед. = 2 клетки вправо и 1 клетка вниз  (dx = +2, dy = +1)
// 🟢 ↓ Высота (H): 1 ед. = 2 клетки строго вниз             (dx =  0, dy = +2)
// Каждая вершина попадает СТРОГО в пересечение клеток тетради!
import { PALETTES } from '../data/tasks.js';

export const STEP_CAPTIONS = [
  'Чистый тетрадный лист. 🔵 Длина ↗ (2 кл. →, 1 ↑), 🟠 Ширина ↘ (2 кл. →, 1 ↓), 🟢 Высота ↓ (2 кл. ↓). Нарисуй или жми «▶ Пошагово»!',
  'Шаг 1 из 5: Рисуем верхнюю грань — от левой точки шагаем по 🔵 Длине ↗ (2→, 1↑) и по 🟠 Ширине ↘ (2→, 1↓), затем замыкаем верх!',
  'Шаг 2 из 5: Из трёх видимых углов (левого, переднего и правого) опускаем 🟢 Высоту строго вниз по клеткам (1 ед. = 2 кл. ↓).',
  'Шаг 3 из 5: Соединяем нижние концы параллельно 🟠 Ширине (↘) и 🔵 Длине (↗) — видимый контур фигуры готов!',
  'Шаг 4 из 5: Проводим 3 невидимых задних ребра аккуратным пунктиром — теперь фигура прозрачная и объёмная!',
  'Шаг 5 из 5: Готово! Сверь свой чертёж в тетради с клетками на доске. Нажми на 🔵 Длина / 🟠 Ширина / 🟢 Высота справа для подсветки!',
];

export function getStepCaption(step) {
  return STEP_CAPTIONS[Math.max(0, Math.min(5, step))] || STEP_CAPTIONS[5];
}

function getDimColors(isDark) {
  return {
    length: {
      stroke: isDark ? '#38bdf8' : '#2563eb',
      bg: isDark ? '#0c2440' : '#eff6ff',
      text: isDark ? '#bae6fd' : '#1d4ed8',
      label: 'Длина',
    },
    width: {
      stroke: isDark ? '#fb923c' : '#ea580c',
      bg: isDark ? '#3b1d0a' : '#fff7ed',
      text: isDark ? '#fed7aa' : '#c2410c',
      label: 'Ширина',
    },
    height: {
      stroke: isDark ? '#4ade80' : '#16a34a',
      bg: isDark ? '#0a2e1a' : '#f0fdf4',
      text: isDark ? '#bbf7d0' : '#15803d',
      label: 'Высота',
    },
  };
}

function buildNotebookSvg(item, options = {}) {
  const {
    theme = 'light',
    step = 5, // 0..5
    revealed = true,
    showHidden = true,
    showDimLabels = true,
    showCellTicks = true,
    highlightDim = null, // 'length' | 'width' | 'height' | null
    drawEnabled = false,
    userLines = [],
  } = options;

  const isDark = theme === 'dark';
  const pal = PALETTES[item.palette] || PALETTES.indigo;
  const dimPal = getDimColors(isDark);
  const effStep = revealed ? step : 0;

  const { L, W, H } = item;

  // Размер одной клетки тетради (адаптивный, чтобы даже большой 5×3×4 отлично смотрелся!)
  const spanCols = 2 * (L + W);
  const spanRows = L + W + 2 * H;
  const S = spanCols > 14 || spanRows > 14 ? 24 : 28;

  // Размер тетрадного листа в клетках (с удобным запасом слева/справа/сверху/снизу под плашки и красные поля!)
  const padLeft = 5;
  const padRight = 6;
  const padTop = 3;
  const padBottom = 4;

  const cols = Math.max(18, spanCols + padLeft + padRight);
  const rows = Math.max(14, spanRows + padTop + padBottom);
  const width = cols * S;
  const height = rows * S;

  // Центрируем фигуру на листе, оставляя 3 клетки справа под красные поля тетради
  const marginColsRight = 3;
  const usableCols = cols - marginColsRight - 1;
  const gxL = Math.max(padLeft, Math.floor(1 + (usableCols - spanCols) / 2));
  const gyTop = Math.max(padTop, Math.floor((rows - spanRows) / 2));
  const gyL = gyTop + L; // левая вершина L0 ниже самой верхней вершины T на L клеток!

  // Перевод координат (iw по Ширине ↘, il по Длине ↗, ih по Высоте ↓) строго в узлы клеток!
  const gridCoord = (iw, il, ih) => [gxL + 2 * (iw + il), gyL + iw - il + 2 * ih];
  const pt = (iw, il, ih) => {
    const [gx, gy] = gridCoord(iw, il, ih);
    return [gx * S, gy * S];
  };

  // 8 вершин кубоида строго на узлах клеток тетради!
  const L0 = pt(0, 0, 0); // левый верхний
  const T0 = pt(0, L, 0); // самый верхний (задний)
  const F0 = pt(W, 0, 0); // передний верхний
  const R0 = pt(W, L, 0); // правый верхний

  const Lb = pt(0, 0, H); // левый нижний
  const Tb = pt(0, L, H); // задний нижний (невидимый)
  const Fb = pt(W, 0, H); // передний нижний
  const Rb = pt(W, L, H); // правый нижний

  // 1) Фон школьного тетрадного листа в клетку + красная линия полей + отверстия переплёта
  const paperBg = isDark ? '#091a33' : '#fdfefe';
  const gridLineColor = isDark ? 'rgba(96, 165, 250, 0.22)' : '#bfd9f2';
  const gridMajorColor = isDark ? 'rgba(96, 165, 250, 0.34)' : '#9ec5ea';
  const marginLineColor = isDark ? 'rgba(248, 113, 113, 0.55)' : 'rgba(239, 68, 68, 0.58)';
  const binderBg = isDark ? 'rgba(15, 23, 42, 0.35)' : 'rgba(148, 163, 184, 0.12)';
  const holeFill = isDark ? '#061021' : '#e2e8f0';

  const gridLines = [];
  for (let c = 1; c < cols; c++) {
    const x = c * S;
    const isMajor = c % 2 === 0;
    gridLines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${isMajor ? gridMajorColor : gridLineColor}" stroke-width="${isMajor ? 1.1 : 0.85}"/>`
    );
  }
  for (let r = 1; r < rows; r++) {
    const y = r * S;
    const isMajor = r % 2 === 0;
    gridLines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${isMajor ? gridMajorColor : gridLineColor}" stroke-width="${isMajor ? 1.1 : 0.85}"/>`
    );
  }

  const marginX = (cols - marginColsRight) * S;
  const holes = [];
  for (let r = 2; r < rows - 1; r += 3) {
    holes.push(
      `<circle cx="${S * 0.48}" cy="${r * S}" r="5.2" fill="${holeFill}" stroke="${gridMajorColor}" stroke-width="1"/>`
    );
  }

  // Узлы сетки для магнитного рисования карандашом
  const snapPoints = [];
  for (let c = 1; c < cols; c++) {
    for (let r = 1; r < rows; r++) {
      snapPoints.push({ gx: c, gy: r, x: c * S, y: r * S });
    }
  }

  const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const lineEl = (p1, p2, extra = '') =>
    `<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" ${extra}/>`;

  // 2) Полупрозрачная заливка граней (Шаг 5) — чтобы клетки тетради красиво просвечивали!
  let facesSvg = '';
  if (effStep >= 5) {
    const op = isDark ? 0.36 : 0.44;
    facesSvg = `
      <g class="nb-faces" opacity="${op}">
        <polygon points="${fmt([L0, T0, R0, F0])}" fill="${pal.top}"/>
        <polygon points="${fmt([L0, F0, Fb, Lb])}" fill="${pal.front}"/>
        <polygon points="${fmt([F0, R0, Rb, Fb])}" fill="${pal.right}"/>
      </g>
    `;
  }

  // 3) Наглядные "лесенки по клеткам" (2→, 1↑ и 2→, 1↓) + пронумерованные кружки шагов на активном шаге!
  let stepGuidesSvg = '';

  const drawIsoStepStairs = (startIw, startIl, startIh, dIw, dIl, dIh, count, color, badgeOffX, badgeOffY) => {
    let out = '';
    for (let k = 0; k < count; k++) {
      const p0 = pt(startIw + dIw * k, startIl + dIl * k, startIh + dIh * k);
      const p1 = pt(startIw + dIw * (k + 1), startIl + dIl * (k + 1), startIh + dIh * (k + 1));

      // Рисуем тонкую пунктирную "лесенку" по клеткам (2 вправо, 1 вверх/вниз) для Длины и Ширины!
      if (dIh === 0) {
        const corner = [p1[0], p0[1]];
        out += `<polyline points="${p0[0]},${p0[1]} ${corner[0]},${corner[1]} ${p1[0]},${p1[1]}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 3" stroke-opacity="0.72"/>`;
      }

      const mx = (p0[0] + p1[0]) / 2 + badgeOffX;
      const my = (p0[1] + p1[1]) / 2 + badgeOffY;
      out += `
        <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="9.5" fill="${color}" opacity="0.95"/>
        <text x="${mx.toFixed(1)}" y="${(my + 3.5).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="800" font-family="JetBrains Mono, monospace">${k + 1}</text>
      `;
    }
    return out;
  };

  // 4) Основные рёбра по шагам 1..5
  const baseStroke = isDark ? pal.strokeDark : pal.stroke;
  const edgeW = effStep >= 5 ? 2.8 : 3.2;
  const mkEdge = (isNew, color) =>
    `stroke="${isNew ? color : baseStroke}" stroke-width="${isNew ? 3.8 : edgeW}" stroke-linecap="round" stroke-linejoin="round"`;

  let edgesSvg = '';
  let hiddenSvg = '';

  // Шаг 1: Верхняя грань (🔵 Длина ↗ и 🟠 Ширина ↘)
  if (effStep >= 1) {
    const isNew = effStep === 1;
    edgesSvg += `
      ${lineEl(L0, T0, mkEdge(isNew, dimPal.length.stroke))}
      ${lineEl(F0, R0, mkEdge(isNew, dimPal.length.stroke))}
      ${lineEl(L0, F0, mkEdge(isNew, dimPal.width.stroke))}
      ${lineEl(T0, R0, mkEdge(isNew, dimPal.width.stroke))}
    `;
    if (isNew && showCellTicks) {
      stepGuidesSvg += drawIsoStepStairs(0, 0, 0, 0, 1, 0, L, dimPal.length.stroke, -11, -13);
      stepGuidesSvg += drawIsoStepStairs(0, 0, 0, 1, 0, 0, W, dimPal.width.stroke, -11, 14);
      [L0, T0, R0, F0].forEach((p) => {
        stepGuidesSvg += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${baseStroke}"/>`;
      });
    }
  }

  // Шаг 2: 3 вертикальных ребра 🟢 Высоты строго вниз по клеткам (1 ед. = 2 кл. ↓)
  if (effStep >= 2) {
    const isNew = effStep === 2;
    edgesSvg += `
      ${lineEl(L0, Lb, mkEdge(isNew, dimPal.height.stroke))}
      ${lineEl(F0, Fb, mkEdge(isNew, dimPal.height.stroke))}
      ${lineEl(R0, Rb, mkEdge(isNew, dimPal.height.stroke))}
    `;
    if (isNew && showCellTicks) {
      stepGuidesSvg += drawIsoStepStairs(0, 0, 0, 0, 0, 1, H, dimPal.height.stroke, -18, 0);
      [Lb, Fb, Rb].forEach((p) => {
        stepGuidesSvg += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${dimPal.height.stroke}"/>`;
      });
    }
  }

  // Шаг 3: Замыкаем нижние видимые рёбра (🟠 Ширина ↘ и 🔵 Длина ↗)
  if (effStep >= 3) {
    const isNew = effStep === 3;
    edgesSvg += `
      ${lineEl(Lb, Fb, mkEdge(isNew, dimPal.width.stroke))}
      ${lineEl(Fb, Rb, mkEdge(isNew, dimPal.length.stroke))}
    `;
    if (isNew && showCellTicks) {
      stepGuidesSvg += drawIsoStepStairs(0, 0, H, 1, 0, 0, W, dimPal.width.stroke, -10, 15);
      stepGuidesSvg += drawIsoStepStairs(W, 0, H, 0, 1, 0, L, dimPal.length.stroke, 12, 14);
    }
  }

  // Шаг 4: Невидимые задние рёбра (аккуратный школьный пунктир!)
  if (effStep >= 4 && (showHidden || effStep === 4)) {
    const isNew = effStep === 4;
    const hColor = isNew ? (isDark ? '#f472b6' : '#db2777') : baseStroke;
    const hOp = isNew ? 0.92 : 0.5;
    const hAttr = `stroke="${hColor}" stroke-width="${isNew ? 3.2 : 2}" stroke-dasharray="7 5" stroke-opacity="${hOp}" stroke-linecap="round"`;
    hiddenSvg = `
      <g class="nb-hidden">
        ${lineEl(T0, Tb, hAttr)}
        ${lineEl(Lb, Tb, hAttr)}
        ${lineEl(Rb, Tb, hAttr)}
        ${isNew ? `<circle cx="${Tb[0]}" cy="${Tb[1]}" r="4.5" fill="${hColor}"/>` : ''}
      </g>
    `;
  }

  // 5) Интерактивная подсветка всех параллельных рёбер при клике на 🔵 Длина / 🟠 Ширина / 🟢 Высота!
  let highlightSvg = '';
  if (highlightDim && effStep >= 1) {
    const c = dimPal[highlightDim]?.stroke || dimPal.length.stroke;
    const pairs = [];
    if (highlightDim === 'length') {
      pairs.push([L0, T0], [F0, R0]);
      if (effStep >= 3) pairs.push([Fb, Rb]);
      if (effStep >= 4 && showHidden) pairs.push([Lb, Tb]);
    } else if (highlightDim === 'width') {
      pairs.push([L0, F0], [T0, R0]);
      if (effStep >= 3) pairs.push([Lb, Fb]);
      if (effStep >= 4 && showHidden) pairs.push([Tb, Rb]);
    } else if (highlightDim === 'height' && effStep >= 2) {
      pairs.push([L0, Lb], [F0, Fb], [R0, Rb]);
      if (effStep >= 4 && showHidden) pairs.push([T0, Tb]);
    }
    highlightSvg = `<g class="nb-hl">${pairs
      .map(
        ([p1, p2]) => `
        <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${c}" stroke-width="11" stroke-opacity="0.26" stroke-linecap="round"/>
        <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`
      )
      .join('')}</g>`;
  }

  // 6) Цветные размерные стрелки и плашки (🔵 Длина ↗, 🟠 Ширина ↘, 🟢 Высота ↕)
  let dimsSvg = '';
  const drawDimArrow = (p1, p2, nx, ny, dist, dimKey, text, anchor) => {
    const dp = dimPal[dimKey];
    const isHl = highlightDim === dimKey;
    const isDimmed = highlightDim && !isHl;
    const op = isDimmed ? 0.35 : 1;

    const a1 = [p1[0] + nx * dist, p1[1] + ny * dist];
    const a2 = [p2[0] + nx * dist, p2[1] + ny * dist];
    const dx = a2[0] - a1[0];
    const dy = a2[1] - a1[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const ah = 7;
    const aw = 4;

    const h1a = [a1[0] + ux * ah + px * aw, a1[1] + uy * ah + py * aw];
    const h1b = [a1[0] + ux * ah - px * aw, a1[1] + uy * ah - py * aw];
    const h2a = [a2[0] - ux * ah + px * aw, a2[1] - uy * ah + py * aw];
    const h2b = [a2[0] - ux * ah - px * aw, a2[1] - uy * ah - py * aw];

    const fs = 11.8;
    const pillW = text.length * fs * 0.57 + 16;
    const pillH = fs + 10;

    const mx = (a1[0] + a2[0]) / 2 + nx * 16;
    const my = (a1[1] + a2[1]) / 2 + ny * 16;

    let rx = mx - pillW / 2;
    if (anchor === 'end') rx = mx - pillW;
    else if (anchor === 'start') rx = mx;
    rx = Math.max(8, Math.min(width - pillW - 8, rx));
    const ry = Math.max(8, Math.min(height - pillH - 8, my - pillH / 2));
    const tx = rx + pillW / 2;
    const ty = ry + pillH / 2 + fs * 0.34;
    const sw = isHl ? 3.2 : 2.1;

    return `
      <g opacity="${op}">
        <line x1="${p1[0] + nx * 4}" y1="${p1[1] + ny * 4}" x2="${a1[0]}" y2="${a1[1]}" stroke="${dp.stroke}" stroke-width="1.2" stroke-dasharray="3 3" stroke-opacity="0.65"/>
        <line x1="${p2[0] + nx * 4}" y1="${p2[1] + ny * 4}" x2="${a2[0]}" y2="${a2[1]}" stroke="${dp.stroke}" stroke-width="1.2" stroke-dasharray="3 3" stroke-opacity="0.65"/>
        <line x1="${a1[0]}" y1="${a1[1]}" x2="${a2[0]}" y2="${a2[1]}" stroke="${dp.stroke}" stroke-width="${sw}" stroke-linecap="round"/>
        <polyline points="${h1a[0].toFixed(1)},${h1a[1].toFixed(1)} ${a1[0].toFixed(1)},${a1[1].toFixed(1)} ${h1b[0].toFixed(1)},${h1b[1].toFixed(1)}" fill="none" stroke="${dp.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="${h2a[0].toFixed(1)},${h2a[1].toFixed(1)} ${a2[0].toFixed(1)},${a2[1].toFixed(1)} ${h2b[0].toFixed(1)},${h2b[1].toFixed(1)}" fill="none" stroke="${dp.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${pillW.toFixed(1)}" height="${pillH.toFixed(1)}" rx="${(pillH / 2).toFixed(1)}" fill="${isHl ? dp.stroke : dp.bg}" stroke="${dp.stroke}" stroke-width="${isHl ? 2.2 : 1.5}"/>
        <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" fill="${isHl ? '#ffffff' : dp.text}" font-family="Manrope, Segoe UI, sans-serif" font-size="${fs}" font-weight="800">${text}</text>
      </g>
    `;
  };

  if (showDimLabels && effStep >= 3) {
    // 🔵 Длина ↗ вдоль верхнего левого ребра L0 -> T0 (нормаль влево-вверх: -0.447, -0.894)
    dimsSvg += drawDimArrow(L0, T0, -0.447, -0.894, 16, 'length', `Длина: ${L} ед.`, 'end');
    // 🟠 Ширина ↘ вдоль нижнего левого ребра Lb -> Fb (нормаль влево-вниз: -0.447, +0.894)
    dimsSvg += drawDimArrow(Lb, Fb, -0.447, 0.894, 16, 'width', `Ширина: ${W} ед.`, 'end');
    // 🟢 Высота ↕ вдоль правого вертикального ребра R0 -> Rb (нормаль вправо: +1, 0)
    dimsSvg += drawDimArrow(R0, Rb, 1, 0, 16, 'height', `Высота: ${H} ед. (${H * 2} кл.)`, 'start');
  }

  // 7) Мини-компас направлений — ТОЧНО КАК НА СКРИНШОТЕ ПОЛЬЗОВАТЕЛЯ!
  // 🔵 ↗ Длина (2 кл. →, 1 ↑) · 🟠 ↘ Ширина (2 кл. →, 1 ↓) · 🟢 ↓ Выс. (2 кл. ↓)
  let compassSvg = '';
  if (effStep === 0 || showDimLabels) {
    const cardW = 196;
    const cardH = 88;
    const cxCard = 22;
    const cyCard = effStep === 0 ? height - cardH - 16 : 12;
    const oxC = cxCard + 54;
    const oyC = cyCard + 36;
    const pLen = [oxC + 32, oyC - 16]; // точный наклон 2→, 1↑!
    const pWid = [oxC + 32, oyC + 16]; // точный наклон 2→, 1↓!
    const pHgt = [oxC, oyC + 32]; // строго вниз 2↓!
    const cBg = isDark ? 'rgba(9, 26, 51, 0.94)' : 'rgba(255, 255, 255, 0.96)';
    const cBorder = isDark ? 'rgba(148, 197, 255, 0.36)' : 'rgba(148, 163, 184, 0.5)';
    const cDot = isDark ? '#e2e8f0' : '#1e293b';

    compassSvg = `
      <g class="nb-compass">
        <rect x="${cxCard}" y="${cyCard}" width="${cardW}" height="${cardH}" rx="14" fill="${cBg}" stroke="${cBorder}" stroke-width="1.3"/>
        <circle cx="${oxC}" cy="${oyC}" r="4" fill="${cDot}"/>
        <line x1="${oxC}" y1="${oyC}" x2="${pLen[0]}" y2="${pLen[1]}" stroke="${dimPal.length.stroke}" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="${oxC}" y1="${oyC}" x2="${pWid[0]}" y2="${pWid[1]}" stroke="${dimPal.width.stroke}" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="${oxC}" y1="${oyC}" x2="${pHgt[0]}" y2="${pHgt[1]}" stroke="${dimPal.height.stroke}" stroke-width="2.8" stroke-linecap="round"/>
        <text x="${pLen[0] + 6}" y="${pLen[1] + 4}" fill="${dimPal.length.text}" font-size="11.5" font-weight="800" font-family="Manrope, sans-serif">↗ Длина (2→ 1↑)</text>
        <text x="${pWid[0] + 6}" y="${pWid[1] + 5}" fill="${dimPal.width.text}" font-size="11.5" font-weight="800" font-family="Manrope, sans-serif">↘ Ширина (2→ 1↓)</text>
        <text x="${oxC - 7}" y="${pHgt[1] + 4}" text-anchor="end" fill="${dimPal.height.text}" font-size="11.5" font-weight="800" font-family="Manrope, sans-serif">↓ Выс.</text>
        <text x="${oxC + 7}" y="${pHgt[1] + 4}" fill="${dimPal.height.text}" font-size="10.5" font-weight="700" font-family="Manrope, sans-serif">(2 кл.)</text>
      </g>
    `;
  }

  // Бейдж масштаба на правом поле тетради
  const scaleTagColor = isDark ? 'rgba(148, 197, 255, 0.72)' : 'rgba(100, 116, 139, 0.85)';
  const scaleBadge = `
    <g class="nb-scale-tag">
      <text x="${width - 10}" y="22" text-anchor="end" fill="${scaleTagColor}" font-size="11.5" font-weight="800" font-family="JetBrains Mono, monospace">1 ед. = 2 кл.</text>
    </g>
  `;

  // 8) Нарисованные учеником линии карандашом по клеткам
  const userLinesSvg = userLines
    .map(
      (ln) =>
        `<line x1="${ln.x1.toFixed(1)}" y1="${ln.y1.toFixed(1)}" x2="${ln.x2.toFixed(1)}" y2="${ln.y2.toFixed(1)}" stroke="${ln.dashed ? '#db2777' : '#e11d48'}" stroke-width="3.6" ${ln.dashed ? 'stroke-dasharray="7 5"' : ''} stroke-linecap="round"/>`
    )
    .join('');

  return {
    snapPoints,
    cellSize: S,
    svgHtml: `
      <svg id="nb-svg" class="nb-svg ${drawEnabled ? 'is-draw-mode' : ''}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="${width}" height="${height}" fill="${paperBg}"/>
        <rect x="0" y="0" width="${S * 0.95}" height="${height}" fill="${binderBg}"/>
        <g class="nb-grid">${gridLines.join('')}</g>
        <line x1="${marginX}" y1="0" x2="${marginX}" y2="${height}" stroke="${marginLineColor}" stroke-width="2"/>
        <g class="nb-holes">${holes.join('')}</g>
        ${facesSvg}
        ${hiddenSvg}
        ${edgesSvg}
        ${highlightSvg}
        ${stepGuidesSvg}
        ${dimsSvg}
        ${compassSvg}
        ${scaleBadge}
        <g class="nb-user-lines">${userLinesSvg}</g>
        <g class="nb-preview-layer"></g>
      </svg>
    `,
  };
}

export class NotebookSheetController {
  constructor(containerEl, onChange) {
    this.container = containerEl;
    this.onChange = onChange;
    this.drawMode = false;
    this.drawDashed = false;
    this.userLines = [];
    this._activeDrag = null;
  }

  setDrawMode(enabled) {
    this.drawMode = Boolean(enabled);
  }

  setDrawDashed(dashed) {
    this.drawDashed = Boolean(dashed);
  }

  clearDrawings() {
    this.userLines = [];
  }

  undoLastLine() {
    if (this.userLines.length > 0) {
      this.userLines.pop();
      return true;
    }
    return false;
  }

  hasUserLines() {
    return this.userLines.length > 0;
  }

  render(item, options = {}) {
    const {
      theme = 'light',
      step = 5,
      revealed = true,
      showHidden = true,
      showDimLabels = true,
      showCellTicks = true,
      highlightDim = null,
    } = options;

    const effStep = revealed ? step : 0;
    const built = buildNotebookSvg(item, {
      theme,
      step: effStep,
      revealed,
      showHidden,
      showDimLabels,
      showCellTicks,
      highlightDim,
      drawEnabled: this.drawMode,
      userLines: this.userLines,
    });

    const bannerText = this.drawMode
      ? `✏️ Режим карандаша (${this.drawDashed ? 'пунктир' : 'сплошная'}): тяни от узла к узлу клетки — подскажем длину в единицах!`
      : getStepCaption(effStep);

    this.container.innerHTML = `
      <div class="nb-sheet">
        <div class="nb-sheet-header">
          <span class="nb-badge">📓 Тетрадь в клетку · ${item.badge}</span>
          <span class="nb-sheet-title">${item.title}</span>
        </div>
        <div class="nb-step-banner">${bannerText}</div>
        <div class="nb-canvas-wrap">
          ${built.svgHtml}
        </div>
      </div>
    `;

    this._attachDraw(built.snapPoints, built.cellSize);
  }

  _attachDraw(snapPoints, cellSize) {
    if (!this.drawMode) return;
    const svg = document.getElementById('nb-svg');
    if (!svg) return;
    const previewLayer = svg.querySelector('.nb-preview-layer');
    if (!previewLayer) return;

    const NS = 'http://www.w3.org/2000/svg';
    const previewLine = document.createElementNS(NS, 'line');
    previewLine.setAttribute('stroke', this.drawDashed ? '#db2777' : '#e11d48');
    previewLine.setAttribute('stroke-width', '3.8');
    previewLine.setAttribute('stroke-dasharray', '6 4');
    previewLine.setAttribute('stroke-linecap', 'round');
    previewLine.style.display = 'none';

    const hoverRing = document.createElementNS(NS, 'circle');
    hoverRing.setAttribute('r', '7');
    hoverRing.setAttribute('fill', 'none');
    hoverRing.setAttribute('stroke', '#e11d48');
    hoverRing.setAttribute('stroke-width', '2.2');
    hoverRing.style.display = 'none';

    const startPin = document.createElementNS(NS, 'circle');
    startPin.setAttribute('r', '5');
    startPin.setAttribute('fill', '#e11d48');
    startPin.style.display = 'none';

    const rulerBg = document.createElementNS(NS, 'rect');
    rulerBg.setAttribute('rx', '8');
    rulerBg.setAttribute('fill', '#0f172a');
    rulerBg.setAttribute('fill-opacity', '0.92');
    rulerBg.style.display = 'none';

    const rulerTxt = document.createElementNS(NS, 'text');
    rulerTxt.setAttribute('fill', '#ffffff');
    rulerTxt.setAttribute('font-size', '11.5');
    rulerTxt.setAttribute('font-weight', '800');
    rulerTxt.setAttribute('font-family', 'JetBrains Mono, monospace');
    rulerTxt.setAttribute('text-anchor', 'middle');
    rulerTxt.style.display = 'none';

    previewLayer.append(previewLine, hoverRing, startPin, rulerBg, rulerTxt);

    const svgPt = svg.createSVGPoint();
    let invCtm = null;
    const refreshCtm = () => {
      const ctm = svg.getScreenCTM();
      invCtm = ctm ? ctm.inverse() : null;
    };

    const toSvg = (e) => {
      if (!invCtm) refreshCtm();
      if (!invCtm) return { x: 0, y: 0 };
      svgPt.x = e.clientX;
      svgPt.y = e.clientY;
      const p = svgPt.matrixTransform(invCtm);
      return { x: p.x, y: p.y };
    };

    const nearest = (p) => {
      let best = null;
      let bestDist = Infinity;
      const maxD2 = (cellSize * 0.72) ** 2;
      for (const d of snapPoints) {
        const dx = d.x - p.x;
        const dy = d.y - p.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = d;
        }
      }
      return bestDist <= maxD2 ? best : null;
    };

    let lastS = null;
    let lastC = null;
    const renderPreview = (sDot, cDot) => {
      if (sDot === lastS && cDot === lastC) return;
      lastS = sDot;
      lastC = cDot;

      if (cDot) {
        hoverRing.setAttribute('cx', cDot.x);
        hoverRing.setAttribute('cy', cDot.y);
        hoverRing.style.display = '';
      } else {
        hoverRing.style.display = 'none';
      }

      if (sDot) {
        startPin.setAttribute('cx', sDot.x);
        startPin.setAttribute('cy', sDot.y);
        startPin.style.display = '';
      } else {
        startPin.style.display = 'none';
      }

      if (sDot && cDot && (sDot.x !== cDot.x || sDot.y !== cDot.y)) {
        previewLine.setAttribute('x1', sDot.x);
        previewLine.setAttribute('y1', sDot.y);
        previewLine.setAttribute('x2', cDot.x);
        previewLine.setAttribute('y2', cDot.y);
        previewLine.style.display = '';

        // Умная живая линейка: распознаёт ↗ Длину (2→, 1↑), ↘ Ширину (2→, 1↓) и ↓ Высоту (2↓)!
        const dx = cDot.gx - sDot.gx;
        const dy = cDot.gy - sDot.gy;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        let label = '';
        if (adx === 0) {
          label = `↕ ${ady} кл.${ady % 2 === 0 ? ` = ${ady / 2} ед.` : ''}`;
        } else if (adx === ady * 2 && dx * dy < 0) {
          label = `↗ Длина: ${ady} ед.`;
        } else if (adx === ady * 2 && dx * dy > 0) {
          label = `↘ Ширина: ${ady} ед.`;
        } else {
          label = `${adx}×${ady} кл.`;
        }
        const mx = (sDot.x + cDot.x) / 2;
        const my = (sDot.y + cDot.y) / 2 - 16;
        const rw = label.length * 7.2 + 16;
        rulerBg.setAttribute('x', (mx - rw / 2).toFixed(1));
        rulerBg.setAttribute('y', (my - 11).toFixed(1));
        rulerBg.setAttribute('width', rw.toFixed(1));
        rulerBg.setAttribute('height', '20');
        rulerBg.style.display = '';

        rulerTxt.setAttribute('x', mx.toFixed(1));
        rulerTxt.setAttribute('y', (my + 3).toFixed(1));
        rulerTxt.textContent = label;
        rulerTxt.style.display = '';
      } else {
        previewLine.style.display = 'none';
        rulerBg.style.display = 'none';
        rulerTxt.style.display = 'none';
      }
    };

    svg.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      refreshCtm();
      svg.setPointerCapture?.(e.pointerId);
      const d = nearest(toSvg(e));
      if (!d) return;
      this._activeDrag = { start: d, cur: d };
      renderPreview(d, d);
    });

    svg.addEventListener('pointermove', (e) => {
      const d = nearest(toSvg(e));
      if (this._activeDrag) {
        this._activeDrag.cur = d || this._activeDrag.cur;
        renderPreview(this._activeDrag.start, this._activeDrag.cur);
      } else {
        renderPreview(null, d);
      }
    });

    svg.addEventListener('pointerup', () => {
      invCtm = null;
      if (!this._activeDrag) return;
      const { start, cur } = this._activeDrag;
      this._activeDrag = null;
      renderPreview(null, null);
      if (start && cur && (start.x !== cur.x || start.y !== cur.y)) {
        this.userLines.push({
          x1: start.x,
          y1: start.y,
          x2: cur.x,
          y2: cur.y,
          dashed: this.drawDashed,
        });
        this.onChange?.();
      }
    });

    svg.addEventListener('pointerleave', () => {
      invCtm = null;
      if (!this._activeDrag) renderPreview(null, null);
    });
  }
}
