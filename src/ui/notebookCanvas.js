// Реалистичный интерактивный тетрадный лист в клетку (масштаб: 1 единица = 2 клетки!)
// 🔵 Длина (L): горизонтально вправо (1 ед. = 2 кл.)
// 🟠 Ширина (W): вглубь вправо-вверх по диагонали клеток (1 ед. = 1 диагональ: +1 кл. →, +1 кл. ↑)
// 🟢 Высота (H): вертикально вверх/вниз (1 ед. = 2 кл.)
import { CELLS_PER_UNIT, PALETTES, pluralDiags } from '../data/tasks.js';

export const STEP_CAPTIONS = [
  'Чистый тетрадный лист. Сначала переведи единицы в клетки (1 ед. = 2 кл.), попробуй начертить сам или нажми «▶ Пошагово»!',
  'Шаг 1 из 5: Рисуем переднюю грань по клеткам — отсчитываем 🔵 Длину (по 2 кл. за ед.) и 🟢 Высоту (по 2 кл. за ед.).',
  'Шаг 2 из 5: Из трёх видимых углов проводим 🟠 Ширину (вглубь) — ровно по диагоналям клеток вправо-вверх (1 ед. = 1 диаг.).',
  'Шаг 3 из 5: Соединяем задние верхнее и правое рёбра параллельно передней грани — видимый контур фигуры готов!',
  'Шаг 4 из 5: Проводим 3 невидимых задних ребра аккуратным пунктиром — так фигура выглядит по-настоящему объёмной!',
  'Шаг 5 из 5: Готово! Сверь свой чертёж в тетради с клетками на доске и проверь все три измерения.',
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
  const cL = L * CELLS_PER_UNIT; // клетки по горизонтали
  const cH = H * CELLS_PER_UNIT; // клетки по вертикали
  const cW = W; // диагонали клеток вправо-вверх (+W кл. вправо, -W кл. вверх)

  // Размер одной тетрадной клетки в координатах SVG
  const S = 30;

  // Размер тетрадного листа в клетках (динамический, с запасом 6 клеток слева под плашку «Высота»)
  const figCols = cL + cW;
  const figRows = cH + cW;
  const cols = Math.max(19, figCols + 11);
  const rows = Math.max(13, figRows + 7);

  const width = cols * S;
  const height = rows * S;

  // Центрируем фигуру на тетрадном листе (учитывая 6 клеток слева под «Высоту» и 3 клетки красных полей справа!)
  const marginColsRight = 3; // красное поле тетради справа (3 клетки)
  const usableCols = cols - marginColsRight - 1;
  const gx0 = Math.max(6, Math.floor(1 + (usableCols - figCols) / 2));
  const gy0 = Math.min(rows - 3, Math.ceil((rows + figRows) / 2) + 0.5);
  const baseRow = Math.round(gy0);

  const pt = (gx, gy) => [gx * S, gy * S];

  // 8 вершин фигуры строго на пересечениях клеток тетради!
  const BL = pt(gx0, baseRow);
  const BR = pt(gx0 + cL, baseRow);
  const TL = pt(gx0, baseRow - cH);
  const TR = pt(gx0 + cL, baseRow - cH);

  const BL2 = pt(gx0 + cW, baseRow - cW);
  const BR2 = pt(gx0 + cL + cW, baseRow - cW);
  const TL2 = pt(gx0 + cW, baseRow - cH - cW);
  const TR2 = pt(gx0 + cL + cW, baseRow - cH - cW);

  // 1) Реалистичный фон тетрадного листа в клетку + красные поля + переплёт
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
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${isMajor ? gridMajorColor : gridLineColor}" stroke-width="${isMajor ? 1.15 : 0.9}"/>`
    );
  }
  for (let r = 1; r < rows; r++) {
    const y = r * S;
    const isMajor = r % 2 === 0;
    gridLines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${isMajor ? gridMajorColor : gridLineColor}" stroke-width="${isMajor ? 1.15 : 0.9}"/>`
    );
  }

  // Красная линия полей тетради справа (отступ 3 клетки)
  const marginX = (cols - marginColsRight) * S;

  // Отверстия тетради слева для аутентичного вида тетрадного листа
  const holes = [];
  for (let r = 2; r < rows - 1; r += 3) {
    holes.push(
      `<circle cx="${S * 0.48}" cy="${r * S}" r="5.5" fill="${holeFill}" stroke="${gridMajorColor}" stroke-width="1"/>`
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
    const op = isDark ? 0.34 : 0.42;
    facesSvg = `
      <g class="nb-faces" opacity="${op}">
        <polygon points="${fmt([TL, TL2, TR2, TR])}" fill="${pal.top}"/>
        <polygon points="${fmt([BL, BR, TR, TL])}" fill="${pal.front}"/>
        <polygon points="${fmt([BR, BR2, TR2, TR])}" fill="${pal.right}"/>
      </g>
    `;
  }

  // 3) Вспомогательные метки подсчёта клеток на активных шагах (1 ед. = 2 кл.!)
  let stepGuidesSvg = '';
  const drawCellHops = (x0, y0, dx, dy, count, color, ox, oy, labelPrefix = '') => {
    let out = '';
    for (let k = 0; k < count; k++) {
      const mx = (x0 + dx * (k + 0.5)) * S + ox;
      const my = (y0 + dy * (k + 0.5)) * S + oy;
      // Маленький аккуратный номер каждой клетки или диагонали
      const r = count > 8 ? 7.8 : 9;
      out += `
        <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${r}" fill="${color}" opacity="0.93"/>
        <text x="${mx.toFixed(1)}" y="${(my + 3.4).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="${count > 8 ? 9.5 : 10.5}" font-weight="800" font-family="JetBrains Mono, monospace">${labelPrefix}${k + 1}</text>
      `;
    }
    return out;
  };

  // Подсветка клеток диагонали на Шаге 2 (чтобы 5-классник видел каждую пройденную клетку по диагонали!)
  const drawDiagHighlight = (startGx, startGy, count) => {
    let out = '';
    for (let k = 0; k < count; k++) {
      const cx = (startGx + k) * S;
      const cy = (startGy - k - 1) * S;
      out += `<rect x="${cx}" y="${cy}" width="${S}" height="${S}" fill="${dimPal.width.stroke}" fill-opacity="0.13" stroke="${dimPal.width.stroke}" stroke-width="1" stroke-dasharray="3 2" stroke-opacity="0.45"/>`;
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

  // Шаг 1: Передняя грань (Длина + Высота)
  if (effStep >= 1) {
    const isNew = effStep === 1;
    edgesSvg += `
      ${lineEl(BL, BR, mkEdge(isNew, dimPal.length.stroke))}
      ${lineEl(TL, TR, mkEdge(isNew, dimPal.length.stroke))}
      ${lineEl(BL, TL, mkEdge(isNew, dimPal.height.stroke))}
      ${lineEl(BR, TR, mkEdge(isNew, dimPal.height.stroke))}
    `;
    if (isNew && showCellTicks) {
      stepGuidesSvg += drawCellHops(gx0, baseRow, 1, 0, cL, dimPal.length.stroke, 0, 14);
      stepGuidesSvg += drawCellHops(gx0, baseRow, 0, -1, cH, dimPal.height.stroke, -15, 0);
      [BL, BR, TL, TR].forEach((p) => {
        stepGuidesSvg += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${baseStroke}"/>`;
      });
    }
  }

  // Шаг 2: Три видимых ребра глубины (Ширина по диагоналям клеток ↗)
  if (effStep >= 2) {
    const isNew = effStep === 2;
    if (isNew && showCellTicks) {
      stepGuidesSvg += drawDiagHighlight(gx0, baseRow - cH, cW);
      stepGuidesSvg += drawDiagHighlight(gx0 + cL, baseRow, cW);
    }
    edgesSvg += `
      ${lineEl(TL, TL2, mkEdge(isNew, dimPal.width.stroke))}
      ${lineEl(TR, TR2, mkEdge(isNew, dimPal.width.stroke))}
      ${lineEl(BR, BR2, mkEdge(isNew, dimPal.width.stroke))}
    `;
    if (isNew && showCellTicks) {
      stepGuidesSvg += drawCellHops(gx0 + cL, baseRow, 1, -1, cW, dimPal.width.stroke, 14, 10);
      [TL2, TR2, BR2].forEach((p) => {
        stepGuidesSvg += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${dimPal.width.stroke}"/>`;
      });
    }
  }

  // Шаг 3: Задние видимые рёбра (верх и право)
  if (effStep >= 3) {
    const isNew = effStep === 3;
    edgesSvg += `
      ${lineEl(TL2, TR2, mkEdge(isNew, dimPal.length.stroke))}
      ${lineEl(BR2, TR2, mkEdge(isNew, dimPal.height.stroke))}
    `;
    if (isNew && showCellTicks) {
      stepGuidesSvg += drawCellHops(gx0 + cW, baseRow - cH - cW, 1, 0, cL, dimPal.length.stroke, 0, -14);
      stepGuidesSvg += drawCellHops(gx0 + cL + cW, baseRow - cW, 0, -1, cH, dimPal.height.stroke, 15, 0);
    }
  }

  // Шаг 4: Невидимые задние рёбра (аккуратный школьный пунктир!)
  if (effStep >= 4 && (showHidden || effStep === 4)) {
    const isNew = effStep === 4;
    const hColor = isNew ? (isDark ? '#f472b6' : '#db2777') : baseStroke;
    const hOp = isNew ? 0.92 : 0.52;
    const hAttr = `stroke="${hColor}" stroke-width="${isNew ? 3.2 : 2.1}" stroke-dasharray="7 5" stroke-opacity="${hOp}" stroke-linecap="round"`;
    hiddenSvg = `
      <g class="nb-hidden">
        ${lineEl(BL, BL2, hAttr)}
        ${lineEl(BL2, TL2, hAttr)}
        ${lineEl(BL2, BR2, hAttr)}
        ${isNew ? `<circle cx="${BL2[0]}" cy="${BL2[1]}" r="4.5" fill="${hColor}"/>` : ''}
      </g>
    `;
  }

  // 5) Интерактивная подсветка всех параллельных рёбер при клике на 🔵 Длина / 🟠 Ширина / 🟢 Высота!
  let highlightSvg = '';
  if (highlightDim && effStep >= 1) {
    const c = dimPal[highlightDim]?.stroke || dimPal.length.stroke;
    const pairs = [];
    if (highlightDim === 'length') {
      pairs.push([BL, BR], [TL, TR]);
      if (effStep >= 3) pairs.push([TL2, TR2]);
      if (effStep >= 4 && showHidden) pairs.push([BL2, BR2]);
    } else if (highlightDim === 'width' && effStep >= 2) {
      pairs.push([TL, TL2], [TR, TR2], [BR, BR2]);
      if (effStep >= 4 && showHidden) pairs.push([BL, BL2]);
    } else if (highlightDim === 'height') {
      pairs.push([BL, TL], [BR, TR]);
      if (effStep >= 3) pairs.push([BR2, TR2]);
      if (effStep >= 4 && showHidden) pairs.push([BL2, TL2]);
    }
    highlightSvg = `<g class="nb-hl">${pairs
      .map(
        ([p1, p2]) => `
        <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${c}" stroke-width="11" stroke-opacity="0.26" stroke-linecap="round"/>
        <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`
      )
      .join('')}</g>`;
  }

  // 6) Цветные размерные стрелки и плашки (Длина / Ширина / Высота + перевод в клетки!)
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
    const ah = 7.5;
    const aw = 4.2;

    const h1a = [a1[0] + ux * ah + px * aw, a1[1] + uy * ah + py * aw];
    const h1b = [a1[0] + ux * ah - px * aw, a1[1] + uy * ah - py * aw];
    const h2a = [a2[0] - ux * ah + px * aw, a2[1] - uy * ah + py * aw];
    const h2b = [a2[0] - ux * ah - px * aw, a2[1] - uy * ah - py * aw];

    const fs = 11.8;
    const pillW = text.length * fs * 0.56 + 16;
    const pillH = fs + 10;

    const mx = (a1[0] + a2[0]) / 2 + nx * 16;
    const my = (a1[1] + a2[1]) / 2 + ny * 16;

    let rx = mx - pillW / 2;
    if (anchor === 'end') rx = mx - pillW;
    else if (anchor === 'start') rx = mx;
    // Не вылезать за границы SVG
    rx = Math.max(8, Math.min(width - pillW - 8, rx));
    const ry = Math.max(8, Math.min(height - pillH - 8, my - pillH / 2));
    const tx = rx + pillW / 2;
    const ty = ry + pillH / 2 + fs * 0.34;
    const sw = isHl ? 3.2 : 2.2;

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
    // 🔵 Длина — снизу под передней гранью
    dimsSvg += drawDimArrow(BL, BR, 0, 1, 18, 'length', `Длина: ${L} ед. (${cL} кл.)`, 'middle');
    // 🟢 Высота — слева от передней грани
    dimsSvg += drawDimArrow(BL, TL, -1, 0, 18, 'height', `Высота: ${H} ед. (${cH} кл.)`, 'end');
    // 🟠 Ширина — справа-снизу вдоль диагонали BR -> BR2
    dimsSvg += drawDimArrow(BR, BR2, 0.707, 0.707, 18, 'width', `Ширина: ${W} ед. (${pluralDiags(W)})`, 'start');
  }

  // 7) Мини-компас направлений (точно как на 2-м скриншоте! Всегда на Шаге 0, а на уроках — в углу листа)
  let compassSvg = '';
  if (effStep === 0 || showDimLabels) {
    const cardW = 192;
    const cardH = 88;
    const cxCard = 24;
    const cyCard = effStep === 0 ? height - cardH - 18 : 14;
    const oxC = cxCard + 52;
    const oyC = cyCard + 42;
    const lenC = 32;
    const pL = [oxC + lenC, oyC];
    const pW = [oxC + lenC * 0.74, oyC - lenC * 0.74];
    const pH = [oxC, oyC + lenC];
    const cBg = isDark ? 'rgba(9, 26, 51, 0.94)' : 'rgba(255, 255, 255, 0.96)';
    const cBorder = isDark ? 'rgba(148, 197, 255, 0.36)' : 'rgba(148, 163, 184, 0.5)';
    const cDot = isDark ? '#e2e8f0' : '#1e293b';

    compassSvg = `
      <g class="nb-compass">
        <rect x="${cxCard}" y="${cyCard}" width="${cardW}" height="${cardH}" rx="14" fill="${cBg}" stroke="${cBorder}" stroke-width="1.3"/>
        <circle cx="${oxC}" cy="${oyC}" r="3.8" fill="${cDot}"/>
        <line x1="${oxC}" y1="${oyC}" x2="${pL[0]}" y2="${pL[1]}" stroke="${dimPal.length.stroke}" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="${oxC}" y1="${oyC}" x2="${pW[0]}" y2="${pW[1]}" stroke="${dimPal.width.stroke}" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="${oxC}" y1="${oyC}" x2="${pH[0]}" y2="${pH[1]}" stroke="${dimPal.height.stroke}" stroke-width="2.8" stroke-linecap="round"/>
        <text x="${pW[0] + 6}" y="${pW[1] + 2}" fill="${dimPal.width.text}" font-size="11.5" font-weight="800" font-family="Manrope, sans-serif">↗ Ширина (1 диаг.)</text>
        <text x="${pL[0] + 6}" y="${pL[1] + 4}" fill="${dimPal.length.text}" font-size="11.5" font-weight="800" font-family="Manrope, sans-serif">→ Длина (2 кл.)</text>
        <text x="${oxC - 7}" y="${pH[1] + 2}" text-anchor="end" fill="${dimPal.height.text}" font-size="11.5" font-weight="800" font-family="Manrope, sans-serif">↓ Выс.</text>
        <text x="${oxC + 8}" y="${pH[1] + 2}" fill="${dimPal.height.text}" font-size="10.5" font-weight="700" font-family="Manrope, sans-serif">(2 кл.)</text>
      </g>
    `;
  }

  // Бейдж масштаба на правом поле тетради
  const scaleTagColor = isDark ? 'rgba(148, 197, 255, 0.7)' : 'rgba(100, 116, 139, 0.85)';
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
      ? `✏️ Режим карандаша (${this.drawDashed ? 'пунктир' : 'сплошная'}): тяни от узла к узлу клетки — подскажем длину в клетках!`
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

    // Pre-allocated SVG preview elements -> 0 DOM parsing on 120Hz touch whiteboards!
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
    rulerBg.setAttribute('fill-opacity', '0.9');
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

        // Живая подсказка длины линии в клетках и единицах!
        const dgx = Math.abs(cDot.gx - sDot.gx);
        const dgy = Math.abs(cDot.gy - sDot.gy);
        let label = '';
        if (dgy === 0) {
          const u = dgx / CELLS_PER_UNIT;
          label = `${dgx} кл.${dgx % 2 === 0 ? ` = ${u} ед.` : ''}`;
        } else if (dgx === 0) {
          const u = dgy / CELLS_PER_UNIT;
          label = `${dgy} кл.${dgy % 2 === 0 ? ` = ${u} ед.` : ''}`;
        } else if (dgx === dgy) {
          label = `${dgx} диаг. = ${dgx} ед.`;
        } else {
          label = `${dgx}×${dgy} кл.`;
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
