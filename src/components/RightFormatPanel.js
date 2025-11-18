import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './RightFormatPanel.css';
import {
  cloneChartData,
  createDatasetId,
  getVariantOptions,
  inferVariant,
  normalizeChartData,
  sanitizeChartData
} from '../utils/chartData';

const TYPE_TITLES = {
  text: 'Text options',
  shape: 'Shape options',
  chart: 'Chart options',
  image: 'Image options'
};

const BULLET_STYLES = [
  {
    label: '•',
    ariaLabel: 'Filled bullet',
    className: 'bullet-dots',
    command: (chain) => chain.focus().updateAttributes('bulletList', { class: 'bullet-dots' })
  },
  {
    label: '◦',
    ariaLabel: 'Hollow bullet',
    className: 'bullet-hollow',
    command: (chain) => chain.focus().updateAttributes('bulletList', { class: 'bullet-hollow' })
  },
  {
    label: '▪',
    ariaLabel: 'Square bullet',
    className: 'bullet-squares',
    command: (chain) => chain.focus().updateAttributes('bulletList', { class: 'bullet-squares' })
  },
  {
    label: '➤',
    ariaLabel: 'Arrow bullet',
    className: 'bullet-arrows',
    command: (chain) => chain.focus().updateAttributes('bulletList', { class: 'bullet-arrows' })
  }
];

const NUMBER_STYLES = [
  {
    label: '1.',
    ariaLabel: 'Arabic numbering',
    className: 'number-arabic',
    command: (chain) => chain.focus().updateAttributes('orderedList', { class: 'number-arabic' })
  },
  {
    label: 'I.',
    ariaLabel: 'Uppercase roman numbering',
    className: 'number-roman-upper',
    command: (chain) => chain.focus().updateAttributes('orderedList', { class: 'number-roman-upper' })
  },
  {
    label: 'a.',
    ariaLabel: 'Lowercase alphabet numbering',
    className: 'number-alpha-lower',
    command: (chain) => chain.focus().updateAttributes('orderedList', { class: 'number-alpha-lower' })
  },
  {
    label: 'i.',
    ariaLabel: 'Lowercase roman numbering',
    className: 'number-roman-lower',
    command: (chain) => chain.focus().updateAttributes('orderedList', { class: 'number-roman-lower' })
  }
];

const LINE_SPACING_OPTIONS = [
  { label: '1.0', value: '1' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' }
];

const TEXT_CASE_OPTIONS = [
  { label: 'UPPERCASE', command: 'toUpperCase' },
  { label: 'lowercase', command: 'toLowerCase' },
  { label: 'Title Case', command: 'toTitleCase' }
];

const BORDER_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' }
];

const normalizeHexColor = (value, fallback = '#000000') => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  const prefixed = value.startsWith('#') ? value : `#${value}`;
  if (/^#[0-9a-f]{6}$/i.test(prefixed)) {
    return prefixed.toUpperCase();
  }
  if (/^#[0-9a-f]{3}$/i.test(prefixed)) {
    const cleaned = prefixed.replace('#', '');
    const expanded = cleaned
      .split('')
      .map((char) => char + char)
      .join('');
    return `#${expanded}`.toUpperCase();
  }
  return fallback;
};

const DEFAULT_CHART_PALETTE = ['#2563EB', '#F97316', '#34D399', '#FBBF24', '#C084FC', '#F472B6'];

const RightFormatPanel = ({
  isOpen,
  element,
  type,
  editor,
  onClose,
  onChangeShapeOpacity,
  onChangeElementSettings,
  onRequestReplace,
  chartPalette = DEFAULT_CHART_PALETTE,
  chartTypeLabels = {}
}) => {
  const [, forceUpdate] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [textCaseSelection, setTextCaseSelection] = useState('');

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    const handleUpdate = () => {
      forceUpdate((tick) => tick + 1);
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  const heading = TYPE_TITLES[type] || 'Element options';

  const paletteForCharts = useMemo(() => {
    return Array.isArray(chartPalette) && chartPalette.length ? chartPalette : DEFAULT_CHART_PALETTE;
  }, [chartPalette]);

  const normalizedChartData = useMemo(() => {
    if (type !== 'chart') {
      return null;
    }
    return normalizeChartData(element?.chartData, paletteForCharts);
  }, [element?.chartData, paletteForCharts, type]);

  const [localChartData, setLocalChartData] = useState(normalizedChartData);

  useEffect(() => {
    setLocalChartData(normalizedChartData);
  }, [normalizedChartData]);

  const commitChartData = useCallback((producer) => {
    if (type !== 'chart' || typeof producer !== 'function') {
      return;
    }
    setLocalChartData((previous) => {
      const base = cloneChartData(previous || normalizedChartData);
      if (!base) {
        return previous;
      }
      const next = producer(base) || base;
      const sanitized = sanitizeChartData(next, paletteForCharts);
      if (typeof onChangeElementSettings === 'function') {
        onChangeElementSettings({
          chartData: sanitized,
          chartType: sanitized.type || element?.chartType || 'bar'
        });
      }
      return sanitized;
    });
  }, [element?.chartType, normalizedChartData, onChangeElementSettings, paletteForCharts, type]);

  const handleChartTitleChange = useCallback((value) => {
    commitChartData((draft) => {
      if (!draft) {
        return draft;
      }
      draft.title = value;
      return draft;
    });
  }, [commitChartData]);

  const datasetVariantOptions = useMemo(() => {
    if (!localChartData) {
      return [];
    }
    return getVariantOptions(localChartData.type);
  }, [localChartData]);

  const canAddSeries = Boolean(localChartData && localChartData.type !== 'pie');
  const canRemoveSeries = Boolean(localChartData?.datasets?.length > 1);
  const canRemoveCategory = Boolean(localChartData?.labels?.length > 1);

  const handleCategoryLabelChange = useCallback((index, value) => {
    commitChartData((draft) => {
      if (!draft || !Array.isArray(draft.labels) || index < 0 || index >= draft.labels.length) {
        return draft;
      }
      draft.labels[index] = value;
      return draft;
    });
  }, [commitChartData]);

  const handleCategoryRemove = useCallback((index) => {
    commitChartData((draft) => {
      if (!draft || !Array.isArray(draft.labels) || draft.labels.length <= 1) {
        return draft;
      }
      if (index < 0 || index >= draft.labels.length) {
        return draft;
      }
      draft.labels.splice(index, 1);
      draft.datasets.forEach((dataset) => {
        dataset.data.splice(index, 1);
        if (draft.type === 'pie' && Array.isArray(dataset.segmentColors)) {
          dataset.segmentColors.splice(index, 1);
        }
      });
      return draft;
    });
  }, [commitChartData]);

  const handleAddCategory = useCallback(() => {
    commitChartData((draft) => {
      if (!draft) {
        return draft;
      }
      const nextLabel = `Category ${draft.labels.length + 1}`;
      draft.labels.push(nextLabel);
      draft.datasets.forEach((dataset) => {
        dataset.data.push(0);
        if (draft.type === 'pie') {
          const colors = Array.isArray(dataset.segmentColors) ? [...dataset.segmentColors] : [];
          while (colors.length < draft.labels.length) {
            colors.push(paletteForCharts[colors.length % paletteForCharts.length]);
          }
          dataset.segmentColors = colors;
        }
      });
      return draft;
    });
  }, [commitChartData, paletteForCharts]);

  const handleDatasetLabelChange = useCallback((datasetIndex, value) => {
    commitChartData((draft) => {
      const target = draft?.datasets?.[datasetIndex];
      if (!target) {
        return draft;
      }
      target.label = value;
      return draft;
    });
  }, [commitChartData]);

  const handleDatasetColorChange = useCallback((datasetIndex, value) => {
    commitChartData((draft) => {
      const target = draft?.datasets?.[datasetIndex];
      if (!target) {
        return draft;
      }
      target.color = normalizeHexColor(value, target.color || paletteForCharts[datasetIndex % paletteForCharts.length]);
      return draft;
    });
  }, [commitChartData, paletteForCharts]);

  const handleDatasetVariantChange = useCallback((datasetIndex, value) => {
    commitChartData((draft) => {
      const target = draft?.datasets?.[datasetIndex];
      if (!target) {
        return draft;
      }
      target.variant = value;
      return draft;
    });
  }, [commitChartData]);

  const handleDatasetValueChange = useCallback((datasetIndex, labelIndex, value) => {
    commitChartData((draft) => {
      const targetDataset = draft?.datasets?.[datasetIndex];
      if (!targetDataset || labelIndex < 0 || labelIndex >= targetDataset.data.length) {
        return draft;
      }
      const parsed = Number.parseFloat(value);
      targetDataset.data[labelIndex] = Number.isFinite(parsed) ? parsed : 0;
      return draft;
    });
  }, [commitChartData]);

  const handleSliceColorChange = useCallback((datasetIndex, labelIndex, color) => {
    commitChartData((draft) => {
      if (!draft || draft.type !== 'pie') {
        return draft;
      }
      const targetDataset = draft.datasets?.[datasetIndex];
      if (!targetDataset) {
        return draft;
      }
      const colors = Array.isArray(targetDataset.segmentColors) ? [...targetDataset.segmentColors] : [];
      while (colors.length < draft.labels.length) {
        colors.push(paletteForCharts[colors.length % paletteForCharts.length]);
      }
      colors[labelIndex] = normalizeHexColor(color, colors[labelIndex] || paletteForCharts[labelIndex % paletteForCharts.length]);
      targetDataset.segmentColors = colors;
      return draft;
    });
  }, [commitChartData, paletteForCharts]);

  const handleAddSeries = useCallback(() => {
    commitChartData((draft) => {
      if (!draft || draft.type === 'pie') {
        return draft;
      }
      const nextIndex = draft.datasets.length;
      draft.datasets.push({
        id: createDatasetId(),
        label: `Series ${nextIndex + 1}`,
        color: paletteForCharts[nextIndex % paletteForCharts.length],
        variant: inferVariant(draft.type, nextIndex),
        data: draft.labels.map(() => 0)
      });
      return draft;
    });
  }, [commitChartData, paletteForCharts]);

  const handleRemoveSeries = useCallback((datasetIndex) => {
    commitChartData((draft) => {
      if (!draft || draft.datasets.length <= 1) {
        return draft;
      }
      draft.datasets.splice(datasetIndex, 1);
      if (draft.type === 'pie' && draft.datasets.length) {
        const dataset = draft.datasets[0];
        if (Array.isArray(dataset.segmentColors)) {
          dataset.segmentColors = dataset.segmentColors.slice(0, draft.labels.length);
        }
      }
      return draft;
    });
  }, [commitChartData]);

  const hasEditor = Boolean(editor);
  const bulletActive = hasEditor ? editor.isActive('bulletList') : false;
  const orderedActive = hasEditor ? editor.isActive('orderedList') : false;
  const bulletClass = hasEditor ? editor.getAttributes('bulletList')?.class || null : null;
  const numberClass = hasEditor ? editor.getAttributes('orderedList')?.class || null : null;
  const hasSelection = hasEditor ? !editor.state.selection.empty : false;

  useEffect(() => {
    if (!hasSelection) {
      setTextCaseSelection('');
    }
  }, [hasSelection]);

  const currentBulletLabel = useMemo(() => {
    if (!hasEditor || !bulletActive) {
      return '•';
    }
    const match = BULLET_STYLES.find((style) => style.className === bulletClass);
    return match?.label || '•';
  }, [bulletActive, bulletClass, hasEditor]);

  const currentNumberLabel = useMemo(() => {
    if (!hasEditor || !orderedActive) {
      return '1.';
    }
    const match = NUMBER_STYLES.find((style) => style.className === numberClass);
    return match?.label || '1.';
  }, [hasEditor, numberClass, orderedActive]);

  const currentLineHeight = useMemo(() => {
    if (!hasEditor) {
      return null;
    }
    const typesToCheck = ['paragraph', 'heading', 'bulletList', 'orderedList'];
    for (const typeName of typesToCheck) {
      if (editor.isActive(typeName)) {
        const value = editor.getAttributes(typeName)?.lineHeight || null;
        if (value) {
          return value;
        }
      }
    }
    return null;
  }, [editor, hasEditor]);

  const toggleBulletList = useCallback(() => {
    setOpenDropdown((prev) => (prev === 'bullets' ? null : 'bullets'));
  }, []);

  const toggleOrderedList = useCallback(() => {
    setOpenDropdown((prev) => (prev === 'numbers' ? null : 'numbers'));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (openDropdown === null) {
      return;
    }

    const handleClickOutside = (event) => {
      const dropdownElement = document.querySelector('.format-panel__dropdown--symbols');
      const buttonElement = document.querySelector('.format-panel__action-btn.has-dropdown');
      
      if (dropdownElement && buttonElement && 
          !dropdownElement.contains(event.target) && 
          !buttonElement.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const applyBulletStyle = useCallback((style) => {
    if (!editor) {
      return;
    }
    if (!editor.isActive('bulletList')) {
      editor.chain().focus().toggleBulletList().run();
    }
    editor
      .chain()
      .focus()
      .updateAttributes('bulletList', { class: style.className })
      .run();
    setOpenDropdown(null);
  }, [editor]);

  const applyNumberStyle = useCallback((style) => {
    if (!editor) {
      return;
    }
    if (!editor.isActive('orderedList')) {
      editor.chain().focus().toggleOrderedList().run();
    }
    editor
      .chain()
      .focus()
      .updateAttributes('orderedList', { class: style.className })
      .run();
    setOpenDropdown(null);
  }, [editor]);

  const setLineSpacing = useCallback(
    (value) => {
      if (!editor) {
        return;
      }
      editor.chain().focus().setLineHeight(value).run();
    },
    [editor]
  );

  const applyTextCase = useCallback(
    (command) => {
      if (!editor || !hasSelection) {
        return;
      }
      const chain = editor.chain().focus();
      if (typeof chain[command] === 'function') {
        chain[command]().run();
      }
    },
    [editor, hasSelection]
  );

  const handleElementSettingsChange = useCallback(
    (patch) => {
      if (typeof onChangeElementSettings === 'function') {
        onChangeElementSettings(patch);
      }
    },
    [onChangeElementSettings]
  );

  const borderSupports = useMemo(() => {
    if (!element) {
      return {
        supportsBorder: type === 'shape' || type === 'image',
        supportsCornerRadius: false,
        usesClipPath: false
      };
    }

    if (type === 'shape') {
      const clipShapes = ['triangle', 'arrow', 'star'];
      const supportsBorder = !['line', ...clipShapes].includes(element.shape);
      const usesClipPath = clipShapes.includes(element.shape);
      return {
        supportsBorder,
        supportsCornerRadius: element.shape === 'rectangle',
        usesClipPath
      };
    }

    if (type === 'image') {
      return {
        supportsBorder: true,
        supportsCornerRadius: false,
        usesClipPath: false
      };
    }

    return {
      supportsBorder: false,
      supportsCornerRadius: false,
      usesClipPath: false
    };
  }, [element, type]);

  const supportsBorderSection = type === 'shape' || type === 'image';
  const fallbackColor = type === 'shape'
    ? normalizeHexColor(element?.color, '#2563EB')
    : normalizeHexColor(element?.borderColor || '#000000', '#000000');
  const elementBorderEnabled = element?.borderEnabled !== false;
  const elementBorderWidth = Number.isFinite(element?.borderWidth) ? element.borderWidth : (type === 'shape' ? 2 : 0);
  const elementBorderStyle = element?.borderStyle || 'solid';
  const elementBorderColor = normalizeHexColor(element?.borderColor, fallbackColor);
  const clampedBorderWidth = Math.max(0, Math.min(20, elementBorderWidth));
  const borderControlsDisabled = !elementBorderEnabled || !borderSupports.supportsBorder;

  const handleToggleBorder = useCallback(() => {
    if (!borderSupports.supportsBorder) {
      return;
    }
    const nextEnabled = !elementBorderEnabled;
    const patch = { borderEnabled: nextEnabled };
    if (nextEnabled && (!elementBorderWidth || elementBorderWidth <= 0)) {
      patch.borderWidth = 2;
    }
    handleElementSettingsChange(patch);
  }, [borderSupports.supportsBorder, elementBorderEnabled, elementBorderWidth, handleElementSettingsChange]);

  const handleBorderStyleChange = useCallback((event) => {
    handleElementSettingsChange({ borderStyle: event.target.value, borderEnabled: true });
  }, [handleElementSettingsChange]);

  const handleBorderColorChange = useCallback((event) => {
    const value = normalizeHexColor(event.target.value, elementBorderColor);
    handleElementSettingsChange({ borderColor: value, borderEnabled: true });
  }, [handleElementSettingsChange, elementBorderColor]);

  const handleBorderWidthChange = useCallback((event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      handleElementSettingsChange({ borderWidth: value, borderEnabled: value > 0 });
    }
  }, [handleElementSettingsChange]);

  useEffect(() => {
    if (!hasEditor) {
      setOpenDropdown(null);
    }
  }, [hasEditor]);

  useEffect(() => {
    if (!isOpen) {
      setOpenDropdown(null);
    }
  }, [isOpen]);

  if (!isOpen || !element) {
    return null;
  }

  return (
    <aside className="format-panel">
      <div className="format-panel__header">
        <h3 className="format-panel__title">{heading}</h3>
        <button
          type="button"
          className="format-panel__close"
          onClick={onClose}
          aria-label="Close format panel"
        >
          ×
        </button>
      </div>

      <div className="format-panel__body">
        {type === 'text' && (
          <section className="format-panel__section">
            <h4 className="format-panel__section-title">List formatting</h4>
            <div className="format-panel__list-row">
              <div className="format-panel__action format-panel__action--inline">
                <button
                  type="button"
                  className={`format-panel__action-btn has-dropdown${bulletActive ? ' is-active' : ''}`}
                  onClick={toggleBulletList}
                  disabled={!hasEditor}
                  aria-label="Bullet list styles"
                >
                  {currentBulletLabel}
                </button>
                {openDropdown === 'bullets' && (
                  <div className="format-panel__dropdown format-panel__dropdown--symbols" role="menu">
                    <button
                      type="button"
                      className={`format-panel__dropdown-item${!bulletActive ? ' is-active' : ''}`}
                      onClick={() => {
                        setOpenDropdown(null);
                        if (bulletActive && editor) {
                          editor.chain().focus().toggleBulletList().run();
                        }
                      }}
                    >
                      None
                    </button>
                    <div className="format-panel__symbol-row" role="group" aria-label="Bullet styles">
                      {BULLET_STYLES.map((style) => (
                        <button
                          key={style.label}
                          type="button"
                          className={`format-panel__dropdown-item format-panel__dropdown-item--symbol${bulletClass === style.className ? ' is-active' : ''}`}
                          aria-label={style.ariaLabel}
                          onClick={() => applyBulletStyle(style)}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="format-panel__action format-panel__action--inline">
                <button
                  type="button"
                  className={`format-panel__action-btn has-dropdown${orderedActive ? ' is-active' : ''}`}
                  onClick={toggleOrderedList}
                  disabled={!hasEditor}
                  aria-label="Numbered list styles"
                >
                  {currentNumberLabel}
                </button>
                {openDropdown === 'numbers' && (
                  <div className="format-panel__dropdown format-panel__dropdown--symbols" role="menu">
                    <button
                      type="button"
                      className={`format-panel__dropdown-item${!orderedActive ? ' is-active' : ''}`}
                      onClick={() => {
                        setOpenDropdown(null);
                        if (orderedActive && editor) {
                          editor.chain().focus().toggleOrderedList().run();
                        }
                      }}
                    >
                      None
                    </button>
                    <div className="format-panel__symbol-row" role="group" aria-label="Numbering styles">
                      {NUMBER_STYLES.map((style) => (
                        <button
                          key={style.label}
                          type="button"
                          className={`format-panel__dropdown-item format-panel__dropdown-item--symbol${numberClass === style.className ? ' is-active' : ''}`}
                          aria-label={style.ariaLabel}
                          onClick={() => applyNumberStyle(style)}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="format-panel__select-inline">
                <select
                  className="format-panel__select format-panel__select--compact"
                  value={currentLineHeight || ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      return;
                    }
                    setLineSpacing(value);
                  }}
                  disabled={!hasEditor}
                  aria-label="Line spacing"
                >
                  <option value="" hidden>
                    Spacing
                  </option>
                  {LINE_SPACING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!hasEditor && (
              <p className="format-panel__placeholder format-panel__placeholder--inline">
                Select the text element to enable these options.
              </p>
            )}
          </section>
        )}

        {type === 'text' && (
          <section className="format-panel__section">
            <h4 className="format-panel__section-title">Text case</h4>
            <div className="format-panel__select-inline">
              <select
                className="format-panel__select format-panel__select--compact"
                value={textCaseSelection}
                onChange={(event) => {
                  const command = event.target.value;
                  if (!command) {
                    return;
                  }
                  setTextCaseSelection(command);
                  applyTextCase(command);
                  setTimeout(() => {
                    setTextCaseSelection('');
                  }, 0);
                }}
                disabled={!hasEditor || !hasSelection}
                aria-label="Change text case"
              >
                <option value="" hidden>
                  Text case
                </option>
                {TEXT_CASE_OPTIONS.map((option) => (
                  <option key={option.command} value={option.command}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {!hasSelection && hasEditor && (
              <p className="format-panel__hint">Select text to transform its case.</p>
            )}
          </section>
        )}

        {supportsBorderSection && (
          <section className="format-panel__section">
            <div className="format-panel__row">
              <h4 className="format-panel__section-title">Border</h4>
              <button
                type="button"
                className={`format-panel__toggle${elementBorderEnabled ? ' is-on' : ''}`}
                onClick={handleToggleBorder}
                disabled={!borderSupports.supportsBorder}
                aria-pressed={elementBorderEnabled && borderSupports.supportsBorder}
                aria-label="Toggle border"
              >
                <span className="format-panel__toggle-track">
                  <span className="format-panel__toggle-thumb" />
                </span>
              </button>
            </div>

            {!borderSupports.supportsBorder && (
              <p className="format-panel__placeholder format-panel__placeholder--inline">
                Border controls aren&apos;t available for this element type.
              </p>
            )}

            {borderSupports.supportsBorder && (
              <div className="format-panel__shape-border-group">
                <div className="format-panel__border-row">
                  <span className="format-panel__border-label">Color</span>
                  <div className="format-panel__border-color">
                    <select
                      value={elementBorderStyle}
                      onChange={handleBorderStyleChange}
                      disabled={borderControlsDisabled}
                    >
                      {BORDER_STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="color"
                      value={elementBorderColor}
                      onChange={handleBorderColorChange}
                      disabled={borderControlsDisabled}
                      aria-label="Choose border color"
                    />
                  </div>
                </div>

                <div className="format-panel__border-row">
                  <span className="format-panel__border-label">Thickness</span>
                  <div className="format-panel__slider-row">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={clampedBorderWidth}
                      onChange={handleBorderWidthChange}
                      disabled={borderControlsDisabled}
                    />
                    <span className="format-panel__slider-value">{Math.round(clampedBorderWidth)}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {type === 'shape' && (
          <section className="format-panel__section">
            <h4 className="format-panel__section-title">Opacity</h4>
            <div className="format-panel__slider-row">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(((element.opacity ?? 1) * 100))}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && typeof onChangeShapeOpacity === 'function') {
                    onChangeShapeOpacity(value / 100);
                  }
                }}
              />
              <span className="format-panel__slider-value">{`${Math.round((element.opacity ?? 1) * 100)}%`}</span>
            </div>
          </section>
        )}

        {type === 'chart' && localChartData && (
          <>
            <section className="format-panel__section">
              <h4 className="format-panel__section-title">Chart title</h4>
              <div className="format-panel__field">
                <label htmlFor="chart-title-input" className="format-panel__label">Title</label>
                <input
                  id="chart-title-input"
                  type="text"
                  className="format-panel__input"
                  value={localChartData.title || ''}
                  onChange={(event) => handleChartTitleChange(event.target.value)}
                  placeholder="Add chart title"
                />
              </div>
            </section>

            <section className="format-panel__section">
              <h4 className="format-panel__section-title">Chart data</h4>
              <div className="format-panel__data-wrapper">
                <table className="format-panel__data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      {localChartData.datasets.map((dataset, datasetIndex) => (
                        <th key={dataset.id || datasetIndex}>
                          <div className="format-panel__dataset-header">
                            <input
                              type="text"
                              className="format-panel__input"
                              value={dataset.label || ''}
                              onChange={(event) => handleDatasetLabelChange(datasetIndex, event.target.value)}
                              placeholder={`Series ${datasetIndex + 1}`}
                            />
                            <div className="format-panel__dataset-controls">
                              {localChartData.type !== 'pie' && (
                                <input
                                  type="color"
                                  value={dataset.color || paletteForCharts[datasetIndex % paletteForCharts.length]}
                                  onChange={(event) => handleDatasetColorChange(datasetIndex, event.target.value)}
                                  aria-label="Series color"
                                />
                              )}
                              {datasetVariantOptions.length > 1 && (
                                <select
                                  className="format-panel__select"
                                  value={dataset.variant}
                                  onChange={(event) => handleDatasetVariantChange(datasetIndex, event.target.value)}
                                >
                                  {datasetVariantOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                className="format-panel__button format-panel__button--danger"
                                onClick={() => handleRemoveSeries(datasetIndex)}
                                disabled={!canRemoveSeries}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localChartData.labels.map((label, labelIndex) => (
                      <tr key={`label-${labelIndex}`}>
                        <td>
                          <div className="format-panel__category-cell">
                            <input
                              type="text"
                              className="format-panel__input"
                              value={label || ''}
                              onChange={(event) => handleCategoryLabelChange(labelIndex, event.target.value)}
                              placeholder={`Category ${labelIndex + 1}`}
                            />
                            <button
                              type="button"
                              className="format-panel__button format-panel__button--danger"
                              onClick={() => handleCategoryRemove(labelIndex)}
                              disabled={!canRemoveCategory}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                        {localChartData.datasets.map((dataset, datasetIndex) => (
                          <td key={`${dataset.id || datasetIndex}-${labelIndex}`}>
                            <div className="format-panel__value-cell">
                              {localChartData.type === 'pie' && (
                                <input
                                  type="color"
                                  value={
                                    dataset.segmentColors?.[labelIndex] ||
                                    dataset.color ||
                                    paletteForCharts[(datasetIndex + labelIndex) % paletteForCharts.length]
                                  }
                                  onChange={(event) => handleSliceColorChange(datasetIndex, labelIndex, event.target.value)}
                                  aria-label="Slice color"
                                />
                              )}
                              <input
                                type="number"
                                className="format-panel__input"
                                value={dataset.data[labelIndex] ?? 0}
                                onChange={(event) => handleDatasetValueChange(datasetIndex, labelIndex, event.target.value)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="format-panel__button-group">
                <button
                  type="button"
                  className="format-panel__button"
                  onClick={handleAddCategory}
                >
                  Add category
                </button>
                {canAddSeries && (
                  <button
                    type="button"
                    className="format-panel__button"
                    onClick={handleAddSeries}
                  >
                    Add series
                  </button>
                )}
              </div>
            </section>

          </>
        )}

        {type === 'chart' && !localChartData && (
          <section className="format-panel__section">
            <p className="format-panel__placeholder">Select a chart to edit its data.</p>
          </section>
        )}

        {type === 'image' && (
          <section className="format-panel__section">
            <h4 className="format-panel__section-title">Image actions</h4>
            <button
              type="button"
              className="format-panel__button"
              onClick={() => onRequestReplace?.(element)}
            >
              Replace image
            </button>
          </section>
        )}

        {type !== 'text' && type !== 'shape' && type !== 'chart' && type !== 'image' && (
          <p className="format-panel__placeholder">Detailed controls coming soon.</p>
        )}
      </div>
    </aside>
  );
};

export default RightFormatPanel;
