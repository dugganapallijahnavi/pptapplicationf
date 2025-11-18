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

const normalizeChartData = (input, palette = []) => {
  const fallbackPalette = palette.length ? palette : ['#2563eb'];
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
        const fallbackColor = fallbackPalette[index % fallbackPalette.length];
        const rawData = Array.isArray(dataset?.data) ? dataset.data : [];
        const normalizedData = labels.map((_, labelIndex) => coerceNumber(rawData[labelIndex]));
        const segmentColors =
          variant === 'pie'
            ? labels.map(
                (_, labelIndex) =>
                  dataset?.segmentColors?.[labelIndex] || fallbackPalette[(index + labelIndex) % fallbackPalette.length]
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
          color: fallbackPalette[0],
          variant: inferVariant(type, 0),
          data: labels.map(() => 0)
        }
      ];

  if (!datasets.length) {
    datasets = [
      {
        id: createDatasetId(),
        label: 'Series 1',
        color: fallbackPalette[0],
        variant: inferVariant(type, 0),
        data: labels.map(() => 0)
      }
    ];
  }

  if (type === 'pie' && datasets.length > 1) {
    datasets = [
      {
        ...datasets[0],
        variant: 'pie',
        data: labels.map((_, index) => coerceNumber(datasets[0].data[index])),
        segmentColors: labels.map(
          (_, index) => datasets[0].segmentColors?.[index] || fallbackPalette[index % fallbackPalette.length]
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
          colors.push(fallbackPalette[(datasetIndex + colors.length) % fallbackPalette.length]);
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

const sanitizeChartData = (localData, palette = []) => {
  const fallbackPalette = palette.length ? palette : ['#2563eb'];
  return {
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
          : localData.labels.map((_, idx) => palette[idx % fallbackPalette.length] || fallbackPalette[idx % fallbackPalette.length]);
        while (colors.length < localData.labels.length) {
          colors.push(fallbackPalette[colors.length % fallbackPalette.length]);
        }
        if (colors.length > localData.labels.length) {
          colors.length = localData.labels.length;
        }
        base.segmentColors = colors;
      }
      return base;
    })
  };
};

const cloneChartData = (data) => {
  if (!data) {
    return null;
  }
  return {
    ...data,
    labels: Array.isArray(data.labels) ? [...data.labels] : [],
    datasets: Array.isArray(data.datasets)
      ? data.datasets.map((dataset) => ({
          ...dataset,
          data: Array.isArray(dataset.data) ? [...dataset.data] : [],
          segmentColors: Array.isArray(dataset.segmentColors) ? [...dataset.segmentColors] : undefined
        }))
      : []
  };
};

export {
  cloneChartData,
  coerceNumber,
  createDatasetId,
  getVariantOptions,
  inferVariant,
  normalizeChartData,
  sanitizeChartData
};
