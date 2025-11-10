import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './ChartDataEditor.css';

const DEFAULT_TYPE = 'bar';

const createDatasetId = () => `series-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const coerceNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const inferVariant = (type, index = 0) => {
  switch (type) {
    case 'area':
      return 'area';
    case 'pie':
      return 'pie';
    case 'columnLine':
      return index === 0 ? 'bar' : index === 1 ? 'line' : 'bar';
    default:
      return 'bar';
  }
};

const getVariantOptions = (type) => {
  switch (type) {
    case 'area':
      return [{ value: 'area', label: 'Area' }];
    case 'pie':
      return [{ value: 'pie', label: 'Slice' }];
    case 'columnLine':
      return [
        { value: 'bar', label: 'Column' },
        { value: 'line', label: 'Line' }
      ];
    default:
      return [{ value: 'bar', label: 'Bar' }];
  }
};

const normalizeChartData = (input, palette) => {
  const source = input || {};
  const type = source.type || DEFAULT_TYPE;
  const labels = Array.isArray(source.labels) && source.labels.length
    ? source.labels.map((label, index) => {
        if (label === undefined || label === null) {
          return `Category ${index + 1}`;
        }
        const stringLabel = String(label);
        return stringLabel.trim() ? stringLabel : `Category ${index + 1}`;
      })
    : ['Category 1'];

  let datasets = Array.isArray(source.datasets) && source.datasets.length
    ? source.datasets.map((dataset, index) => {
        const variant = dataset?.variant || inferVariant(type, index);
        const colorFromSource = dataset?.color;
        const fallbackColor = palette[index % palette.length];
        const rawData = Array.isArray(dataset?.data) ? dataset.data : [];
        const normalizedData = labels.map((_, labelIndex) => coerceNumber(rawData[labelIndex]));
        const segmentColors =
          variant === 'pie'
            ? labels.map(
                (_, labelIndex) =>
                  dataset?.segmentColors?.[labelIndex] || palette[(index + labelIndex) % palette.length]
              )
            : undefined;
        return {
          id: dataset?.id || createDatasetId(),
          label: dataset?.label?.toString()?.trim() || `Series ${index + 1}`,
          color: colorFromSource || fallbackColor,
          variant,
          data: normalizedData,
          segmentColors
        };
      })
    : [
        {
          id: createDatasetId(),
          label: 'Series 1',
          color: palette[0],
          variant: inferVariant(type, 0),
          data: labels.map(() => 0)
        }
      ];

  // Ensure there is at least one dataset
  if (!datasets.length) {
    datasets = [
      {
        id: createDatasetId(),
        label: 'Series 1',
        color: palette[0],
        variant: inferVariant(type, 0),
        data: labels.map(() => 0)
      }
    ];
  }

  // Keep a single dataset for pie charts
  if (type === 'pie' && datasets.length > 1) {
    datasets = [
      {
        ...datasets[0],
        variant: 'pie',
        data: labels.map((_, index) => coerceNumber(datasets[0].data[index])),
        segmentColors: labels.map(
          (_, index) => datasets[0].segmentColors?.[index] || palette[index % palette.length]
        )
      }
    ];
  }

  return {
    type,
    title: source.title || '',
    labels,
    datasets: datasets.map((dataset, datasetIndex) => {
      const adjustedData = [...dataset.data];
      if (adjustedData.length < labels.length) {
        while (adjustedData.length < labels.length) {
          adjustedData.push(0);
        }
      } else if (adjustedData.length > labels.length) {
        adjustedData.length = labels.length;
      }
      const base = {
        ...dataset,
        variant: inferVariant(type, datasetIndex),
        data: adjustedData
      };
      if (type === 'pie') {
        const colors = Array.isArray(dataset.segmentColors) ? [...dataset.segmentColors] : [];
        while (colors.length < labels.length) {
          colors.push(palette[(datasetIndex + colors.length) % palette.length]);
        }
        if (colors.length > labels.length) {
          colors.length = labels.length;
        }
        base.segmentColors = colors;
      }
      return base;
    })
  };
};

const sanitizeChartData = (localData, palette) => ({
  ...localData,
  labels: localData.labels.map((label, index) => {
    const trimmed = label?.toString()?.trim();
    return trimmed ? trimmed : `Category ${index + 1}`;
  }),
  datasets: localData.datasets.map((dataset, datasetIndex) => {
    const base = {
      ...dataset,
      label: dataset.label?.toString()?.trim() || `Series ${datasetIndex + 1}`,
      variant: dataset.variant || inferVariant(localData.type, datasetIndex),
      data: dataset.data.map((value) => coerceNumber(value))
    };
    if (localData.type === 'pie') {
      const colors = Array.isArray(dataset.segmentColors)
        ? [...dataset.segmentColors]
        : localData.labels.map((_, idx) => palette[idx % palette.length]);
      while (colors.length < localData.labels.length) {
        colors.push(palette[colors.length % palette.length]);
      }
      if (colors.length > localData.labels.length) {
        colors.length = localData.labels.length;
      }
      base.segmentColors = colors;
    }
    return base;
  })
});

const ChartDataEditor = ({
  isOpen,
  data,
  chartTypeLabels,
  palette,
  onClose,
  onSave,
  onChange
}) => {
  const [localData, setLocalData] = useState(() => normalizeChartData(data, palette));

  useEffect(() => {
    if (isOpen) {
      setLocalData(normalizeChartData(data, palette));
    }
  }, [data, palette, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const variantOptions = useMemo(() => getVariantOptions(localData.type), [localData.type]);
  const canAddSeries = localData.type !== 'pie';

  const applyChange = useCallback(
    (producer) => {
      setLocalData((prev) => {
        const next = producer(prev);
        if (isOpen && typeof onChange === 'function') {
          onChange(sanitizeChartData(next, palette));
        }
        return next;
      });
    },
    [isOpen, onChange, palette]
  );

  if (!isOpen) {
    return null;
  }

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    applyChange((prev) => {
      const nextDatasets = (prev.datasets || []).map((dataset, index) => ({
        ...dataset,
        variant: inferVariant(nextType, index)
      }));
      const alignedDatasets = nextType === 'pie' && nextDatasets.length > 1
        ? [
            {
              ...nextDatasets[0],
              variant: 'pie'
            }
          ]
        : nextDatasets;
      return {
        ...prev,
        type: nextType,
        datasets: alignedDatasets
      };
    });
  };

  const handleTitleChange = (event) => {
    const { value } = event.target;
    applyChange((prev) => ({ ...prev, title: value }));
  };

  const handleLabelChange = (index, value) => {
    applyChange((prev) => {
      const labels = [...prev.labels];
      labels[index] = value;
      return { ...prev, labels };
    });
  };

  const handleDatasetLabelChange = (datasetIndex, value) => {
    applyChange((prev) => {
      const datasets = prev.datasets.map((dataset, index) =>
        index === datasetIndex ? { ...dataset, label: value } : dataset
      );
      return { ...prev, datasets };
    });
  };

  const handleDatasetColorChange = (datasetIndex, value) => {
    applyChange((prev) => {
      if (prev.type === 'pie') {
        return prev;
      }
      const datasets = prev.datasets.map((dataset, index) =>
        index === datasetIndex ? { ...dataset, color: value } : dataset
      );
      return { ...prev, datasets };
    });
  };

  const handleDatasetVariantChange = (datasetIndex, value) => {
    applyChange((prev) => {
      const datasets = prev.datasets.map((dataset, index) =>
        index === datasetIndex ? { ...dataset, variant: value } : dataset
      );
      return { ...prev, datasets };
    });
  };

  const handleValueChange = (datasetIndex, labelIndex, value) => {
    applyChange((prev) => {
      const datasets = prev.datasets.map((dataset, index) => {
        if (index !== datasetIndex) {
          return dataset;
        }
        const nextValues = [...dataset.data];
        nextValues[labelIndex] = value;
        return { ...dataset, data: nextValues };
      });
      return { ...prev, datasets };
    });
  };

  const handleSliceColorChange = (labelIndex, color) => {
    applyChange((prev) => {
      if (prev.type !== 'pie') {
        return prev;
      }
      const datasets = prev.datasets.map((dataset) => {
        const baseColors = Array.isArray(dataset.segmentColors)
          ? [...dataset.segmentColors]
          : prev.labels.map((_, idx) => dataset.color || palette[idx % palette.length]);
        const colors = [...baseColors];
        while (colors.length < prev.labels.length) {
          colors.push(palette[colors.length % palette.length]);
        }
        colors[labelIndex] = color;
        return { ...dataset, segmentColors: colors };
      });
      return { ...prev, datasets };
    });
  };

  const addCategory = () => {
    applyChange((prev) => {
      const nextLabel = `Category ${prev.labels.length + 1}`;
      const labels = [...prev.labels, nextLabel];
      const datasets = prev.datasets.map((dataset) => ({
        ...dataset,
        data: [...dataset.data, 0]
      }));
      return { ...prev, labels, datasets };
    });
  };

  const removeCategory = (index) => {
    applyChange((prev) => {
      if (prev.labels.length <= 1) {
        return prev;
      }
      const labels = prev.labels.filter((_, labelIndex) => labelIndex !== index);
      const datasets = prev.datasets.map((dataset) => ({
        ...dataset,
        data: dataset.data.filter((_, labelIndex) => labelIndex !== index)
      }));
      return { ...prev, labels, datasets };
    });
  };

  const addSeries = () => {
    if (!canAddSeries) {
      return;
    }
    applyChange((prev) => {
      const nextIndex = prev.datasets.length;
      const newDataset = {
        id: createDatasetId(),
        label: `Series ${nextIndex + 1}`,
        color: palette[nextIndex % palette.length],
        variant: inferVariant(prev.type, nextIndex),
        data: prev.labels.map(() => 0)
      };
      return { ...prev, datasets: [...prev.datasets, newDataset] };
    });
  };

  const removeSeries = (index) => {
    applyChange((prev) => {
      if (prev.datasets.length <= 1) {
        return prev;
      }
      const datasets = prev.datasets.filter((_, datasetIndex) => datasetIndex !== index);
      return { ...prev, datasets };
    });
  };

  const handleSave = () => {
    const sanitized = sanitizeChartData(localData, palette);
    onSave(sanitized);
  };

  return (
    <aside className="chart-data-editor-panel" role="dialog" aria-modal="true">
        <div className="chart-editor-header">
          <div>
            <h2>Edit Chart Data</h2>
            <p>Update the chart title, categories, and series values.</p>
          </div>
          <button type="button" className="chart-editor-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="chart-editor-body">
          <div className="chart-editor-field">
            <label htmlFor="chart-title">Chart title</label>
            <input
              id="chart-title"
              type="text"
              value={localData.title}
              onChange={handleTitleChange}
              placeholder="Enter chart title"
            />
          </div>

          <div className="chart-editor-field">
            <label htmlFor="chart-type">Chart type</label>
            <select id="chart-type" value={localData.type} onChange={handleTypeChange}>
              {Object.entries(chartTypeLabels).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="chart-editor-table">
            <table>
              <thead>
                <tr>
                  <th className="category-column">Category</th>
                  {localData.datasets.map((dataset, datasetIndex) => (
                    <th key={dataset.id}>
                      <div className="dataset-header">
                        <input
                          type="text"
                          value={dataset.label}
                          onChange={(event) => handleDatasetLabelChange(datasetIndex, event.target.value)}
                          placeholder={`Series ${datasetIndex + 1}`}
                        />
                        <div className="dataset-controls">
                          {localData.type !== 'pie' && (
                            <input
                              type="color"
                              value={dataset.color || '#2563eb'}
                              onChange={(event) => handleDatasetColorChange(datasetIndex, event.target.value)}
                              aria-label="Series color"
                            />
                          )}
                          {variantOptions.length > 1 && (
                            <select
                              value={dataset.variant}
                              onChange={(event) => handleDatasetVariantChange(datasetIndex, event.target.value)}
                            >
                              {variantOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            className="dataset-remove"
                            onClick={() => removeSeries(datasetIndex)}
                            disabled={localData.datasets.length <= 1}
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
                {localData.labels.map((label, labelIndex) => (
                  <tr key={`label-${labelIndex}`}>
                    <td>
                      <div className="category-cell">
                        <input
                          type="text"
                          value={label}
                          onChange={(event) => handleLabelChange(labelIndex, event.target.value)}
                          placeholder={`Category ${labelIndex + 1}`}
                        />
                        <button
                          type="button"
                          className="category-remove"
                          onClick={() => removeCategory(labelIndex)}
                          disabled={localData.labels.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                    {localData.datasets.map((dataset, datasetIndex) => (
                      <td key={`${dataset.id}-${labelIndex}`}>
                        <div className="value-cell">
                          {localData.type === 'pie' && (
                            <input
                              type="color"
                              value={
                                dataset.segmentColors?.[labelIndex] ||
                                dataset.color ||
                                palette[labelIndex % palette.length]
                              }
                              onChange={(event) => handleSliceColorChange(labelIndex, event.target.value)}
                              aria-label={`Slice color for ${label}`}
                              className="value-color-input"
                            />
                          )}
                          <input
                            type="number"
                            value={dataset.data[labelIndex]}
                            onChange={(event) => handleValueChange(datasetIndex, labelIndex, event.target.value)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="chart-editor-actions-row">
            <button type="button" onClick={addCategory} className="chart-editor-action">
              Add Category
            </button>
            <button
              type="button"
              onClick={addSeries}
              className="chart-editor-action"
              disabled={!canAddSeries}
            >
              Add Series
            </button>
          </div>
        </div>

        <div className="chart-editor-footer">
          <button type="button" className="chart-editor-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="chart-editor-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </aside>
  );
};

export default ChartDataEditor;
