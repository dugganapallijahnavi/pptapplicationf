import PptxGenJS from 'pptxgenjs';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const SLIDE_WIDTH_IN = 10;
const SLIDE_HEIGHT_IN = 5.625;

const DEFAULT_SERIES_COLORS = [
  '#3B82F6',
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#0EA5E9'
];

const TEXT_BOX_PADDING = {
  top: 10,
  right: 14,
  bottom: 10,
  left: 14
};

const pxToPoints = (value) => {
  const numeric = Number(value) || 0;
  return Number.isFinite(numeric) ? Number((numeric * 0.75).toFixed(2)) : 0;
};

const pxToInches = (value, axis = 'x') => {
  const numeric = Number(value) || 0;
  const base = axis === 'x' ? CANVAS_WIDTH : CANVAS_HEIGHT;
  const slideBase = axis === 'x' ? SLIDE_WIDTH_IN : SLIDE_HEIGHT_IN;
  const inches = (numeric / base) * slideBase;
  return Number.isFinite(inches) ? Number(inches.toFixed(2)) : 0;
};

const normalizeHex = (input, fallback = 'FFFFFF') => {
  if (!input) {
    return fallback;
  }
  const hex = String(input).replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return fallback;
  }
  return hex.toUpperCase();
};

const getSlideBackground = (slide) => {
  if (!slide) {
    return 'FFFFFF';
  }
  if (typeof slide.background === 'string') {
    return slide.background;
  }
  if (slide.background && typeof slide.background === 'object') {
    return slide.background.color || slide.background.fill || 'FFFFFF';
  }
  return 'FFFFFF';
};

const determineFontFace = (fontFamily) => {
  if (!fontFamily) {
    return 'Segoe UI';
  }
  return fontFamily.split(',')[0].replace(/["']/g, '').trim() || 'Segoe UI';
};

const htmlToPlainText = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getTextOptions = (item) => {
  const fontSize = Number(item.fontSize) || 18;
  return {
    x: pxToInches(item.x || 0, 'x'),
    y: pxToInches(item.y || 0, 'y'),
    w: pxToInches(item.width || CANVAS_WIDTH * 0.6, 'x'),
    h: pxToInches(item.height || CANVAS_HEIGHT * 0.2, 'y'),
    fontSize: Math.max(10, Math.round(fontSize * 0.75)),
    fontFace: determineFontFace(item.fontFamily),
    color: normalizeHex(item.color, 'F5F5F5'),
    align: (item.textAlign || 'left').toLowerCase(),
    bold: Boolean(item.bold || (item.fontWeight && Number(item.fontWeight) >= 600)),
    italic: Boolean(item.italic),
    underline: Boolean(item.underline),
    lineSpacingMultiple: 1.2,
    valign: (item.verticalAlign || 'top').toLowerCase(),
    autoFit: item.autoFit ?? false,
    margin: [
      pxToPoints(TEXT_BOX_PADDING.top),
      pxToPoints(TEXT_BOX_PADDING.right),
      pxToPoints(TEXT_BOX_PADDING.bottom),
      pxToPoints(TEXT_BOX_PADDING.left)
    ]
  };
};

const addTextElements = (pptSlide, slide) => {
  (slide?.content || []).forEach((item) => {
    if (item?.type !== 'text') {
      return;
    }
    const rawHtml = item.text || '';
    const text = (item.plainText ?? htmlToPlainText(rawHtml)).trim();
    if (!text) {
      return;
    }
    pptSlide.addText(text, getTextOptions(item));
  });
};

const inchesOptions = (item, defaults = {}) => ({
  x: pxToInches(item.x ?? defaults.x ?? 0, 'x'),
  y: pxToInches(item.y ?? defaults.y ?? 0, 'y'),
  w: pxToInches(item.width ?? defaults.w ?? CANVAS_WIDTH * 0.25, 'x'),
  h: pxToInches(item.height ?? defaults.h ?? CANVAS_HEIGHT * 0.25, 'y')
});

const addShapeElements = (pptx, pptSlide, slide) => {
  const { ShapeType } = pptx;
  if (!ShapeType) {
    return;
  }

  (slide?.content || []).forEach((item) => {
    if (item?.type !== 'shape') {
      return;
    }

    const fillColor = normalizeHex(item.color || item.fillColor || '#3B82F6');
    const strokeColor = normalizeHex(item.borderColor || item.color || fillColor);
    const strokeWidth = Math.max(0, Number(item.borderWidth || 0) * 0.75);

    const baseOptions = {
      ...inchesOptions(item, { w: 160, h: 100 }),
      fill: { color: fillColor },
      line: {
        color: strokeColor,
        width: strokeWidth
      }
    };

    if (item.text && item.shape !== 'line') {
      baseOptions.text = {
        text: item.text,
        options: {
          align: 'center',
          fontFace: 'Segoe UI',
          fontSize: 14,
          color: 'FFFFFF'
        }
      };
    }

    const shapeMap = {
      circle: ShapeType.ellipse,
      triangle: ShapeType.triangle,
      arrow: ShapeType.rightArrow,
      star: ShapeType.star5,
      line: ShapeType.line
    };

    const shapeType = shapeMap[item.shape] || ShapeType.rect;
    pptSlide.addShape(shapeType, baseOptions);
  });
};

const addImageElements = (pptSlide, slide) => {
  (slide?.content || []).forEach((item) => {
    if (item?.type !== 'image' || !item.src) {
      return;
    }

    pptSlide.addImage({
      data: item.src,
      ...inchesOptions(item, { w: 320, h: 240 })
    });
  });
};

const normalizeDataset = (dataset, labels) => ({
  name: dataset.label || 'Series',
  labels,
  values: Array.isArray(dataset.data) ? dataset.data : labels.map(() => 0)
});

const resolveSeriesColor = (dataset, fallback) => {
  const directColor = dataset.color || dataset.borderColor || dataset.backgroundColor;
  if (Array.isArray(directColor)) {
    return normalizeHex(directColor[0], fallback);
  }
  if (typeof directColor === 'string') {
    return normalizeHex(directColor, fallback);
  }
  return normalizeHex(fallback);
};

const resolvePieColors = (dataset, fallbackPalette) => {
  if (Array.isArray(dataset.segmentColors) && dataset.segmentColors.length) {
    return dataset.segmentColors.map((color, index) =>
      normalizeHex(color, fallbackPalette[index % fallbackPalette.length])
    );
  }

  if (Array.isArray(dataset.backgroundColor) && dataset.backgroundColor.length) {
    return dataset.backgroundColor.map((color, index) =>
      normalizeHex(color, fallbackPalette[index % fallbackPalette.length])
    );
  }

  const baseColor = resolveSeriesColor(dataset, fallbackPalette[0]);
  const length = Array.isArray(dataset.data) ? dataset.data.length : fallbackPalette.length;
  return Array.from({ length }, (_, index) => normalizeHex(baseColor, fallbackPalette[index % fallbackPalette.length]));
};

const addChartElements = (pptx, pptSlide, slide) => {
  const { ChartType } = pptx;
  if (!ChartType) {
    return;
  }

  (slide?.content || []).forEach((item) => {
    if (item?.type !== 'chart') {
      return;
    }

    const data = item.chartData || {};
    const labels = Array.isArray(data.labels) ? data.labels : [];
    const datasets = Array.isArray(data.datasets) ? data.datasets : [];
    if (!labels.length || !datasets.length) {
      return;
    }

    const baseOptions = {
      ...inchesOptions(item, { w: 420, h: 280 })
    };

    const chartType = (item.chartType || data.type || 'bar').toLowerCase();

    if (chartType === 'pie') {
      const seriesColors = resolvePieColors(datasets[0] || {}, DEFAULT_SERIES_COLORS);
      const pieSeries = datasets[0] ? [normalizeDataset(datasets[0], labels)] : [];
      pptSlide.addChart(ChartType.pie, pieSeries, {
        ...baseOptions,
        chartColors: seriesColors
      });
      return;
    }

    if (chartType === 'area') {
      const areaSeries = datasets.map((dataset) => normalizeDataset(dataset, labels));
      const chartColors = datasets.map((dataset, index) =>
        resolveSeriesColor(dataset, DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length])
      );
      pptSlide.addChart(ChartType.area, areaSeries, {
        ...baseOptions,
        chartColors
      });
      return;
    }

    if (chartType === 'columnline' && datasets.length >= 2) {
      const comboSeries = datasets.map((dataset, index) => ({
        type: index === datasets.length - 1 ? ChartType.line : ChartType.column,
        ...normalizeDataset(dataset, labels)
      }));
      const chartColors = datasets.map((dataset, index) =>
        resolveSeriesColor(dataset, DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length])
      );
      pptSlide.addChart(ChartType.combo, comboSeries, {
        ...baseOptions,
        chartColors
      });
      return;
    }

    const barSeries = datasets.map((dataset) => normalizeDataset(dataset, labels));
    const chartColors = datasets.map((dataset, index) =>
      resolveSeriesColor(dataset, DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length])
    );
    pptSlide.addChart(ChartType.bar, barSeries, {
      ...baseOptions,
      chartColors
    });
  });
};

export const exportSlidesAsPptx = async (slides, fileName) => {
  if (typeof PptxGenJS !== 'function') {
    throw new Error('Unable to load PowerPoint exporter. Please refresh and try again.');
  }

  const pptx = new PptxGenJS();

  (slides || []).forEach((slide) => {
    const backgroundColor = normalizeHex(getSlideBackground(slide));
    const pptSlide = pptx.addSlide({
      bkgd: backgroundColor
    });

    // Explicitly set background as some pptx themes ignore the addSlide option alone
    pptSlide.background = {
      color: backgroundColor
    };
    addTextElements(pptSlide, slide);
    addShapeElements(pptx, pptSlide, slide);
    addImageElements(pptSlide, slide);
    addChartElements(pptx, pptSlide, slide);
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const desiredName = fileName || `presentation-${timestamp}.pptx`;
  await pptx.writeFile({ fileName: desiredName });
};
