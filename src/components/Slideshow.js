import React, { useState, useEffect, useRef } from 'react';
import './Slideshow.css';

const hexToRgba = (hex, alpha = 1) => {
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) return hex;
  
  const value = parseInt(sanitized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r}, ${g}, ${b}, ${alpha}`;
};

const PIE_COLORS = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#c084fc', '#f472b6'];
const CHART_SERIES_COLORS = [
  '#2563eb',
  '#f97316',
  '#34d399',
  '#fbbf24',
  '#c084fc',
  '#f472b6'
];

const SLIDE_BASE_WIDTH = 960;
const SLIDE_BASE_HEIGHT = 540;

// Helper functions

const normalizeChartStructure = (chart) => {
  if (!chart || chart.type !== 'chart') {
    return { series: [], data: [] };
  }

  const paletteColor = (index) =>
    CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];

  const inputSeries = Array.isArray(chart.series) ? chart.series : [];
  let seriesList = inputSeries.length > 0
    ? inputSeries.map((series, index) => ({
        id: series?.id || `series-${index}`,
        name: typeof series?.name === 'string' && series.name.trim()
          ? series.name
          : `Series ${index + 1}`,
        color: typeof series?.color === 'string' && series.color.trim()
          ? series.color
          : (index === 0 && chart.accentColor) || paletteColor(index)
      }))
    : [{
        id: 'series-0',
        name: 'Series 1',
        color: chart.accentColor || paletteColor(0)
      }];

  const seenSeriesIds = new Set();
  seriesList = seriesList.map((series, index) => {
    let id = series.id;
    if (!id || seenSeriesIds.has(id)) {
      id = `series-${index}`;
    }
    seenSeriesIds.add(id);
    return {
      id,
      name: series.name,
      color: series.color || paletteColor(index)
    };
  });

  const ensureValuesForSeries = (values) => {
    const sanitized = {};
    seriesList.forEach((series) => {
      const raw = values?.[series.id];
      const numeric = Number(raw);
      sanitized[series.id] = Number.isFinite(numeric) ? numeric : 0;
    });
    return sanitized;
  };

  const rawData = Array.isArray(chart.data) ? chart.data : [];
  const data = rawData.map((point, index) => {
    const label = typeof point?.label === 'string' && point.label.trim()
      ? point.label
      : `Item ${index + 1}`;
    const id = point?.id || `category-${index}`;

    if (point?.values && typeof point.values === 'object') {
      return {
        id,
        label,
        values: ensureValuesForSeries(point.values)
      };
    }

    const values = ensureValuesForSeries({});
    if (Number.isFinite(Number(point?.value))) {
      const firstSeries = seriesList[0];
      if (firstSeries) {
        values[firstSeries.id] = Number(point.value);
      }
    }

    return { id, label, values };
  });

  if (!data.length) {
    data.push({
      id: 'category-0',
      label: 'Category 1',
      values: ensureValuesForSeries({})
    });
  }

  return { series: seriesList, data };
};

const renderChartVisual = (chart) => {
  const { series, data } = normalizeChartStructure(chart);
  if (!data.length || !series.length) {
    return (
      <div className="chart-empty">
        Add data rows to populate this chart.
        <br />
        You can add data rows by clicking the "Add Row" button in the chart editor.
      </div>
    );
  }

  const chartTitle = chart.title?.trim() || '';
  const axisLabels = {
    x: chart.xAxisLabel || 'Categories',
    y: chart.yAxisLabel || 'Value'
  };

  const renderLegend = (orientation = 'vertical') => {
    if (!series.length) return null;
    return (
      <div className={`chart-legend chart-legend-${orientation}`}>
        {series.map((seriesItem) => (
          <div key={seriesItem.id} className="chart-legend-item">
            <span
              className="chart-legend-swatch"
              style={{ backgroundColor: seriesItem.color || '#1a73e8' }}
            />
            <span className="chart-legend-label">{seriesItem.name}</span>
          </div>
        ))}
      </div>
    );
  };

  if (chart.chartType === 'pie') {
    const primarySeries = series[0];
    const dataset = chart.chartData?.datasets?.[0] || {};
    const segmentColors = Array.isArray(dataset.segmentColors)
      ? dataset.segmentColors
      : [];

    const pieData = data.map((point, index) => {
      const value = Number(point.values[primarySeries?.id]) || 0;
      const color =
        segmentColors[index] ||
        primarySeries?.color ||
        PIE_COLORS[index % PIE_COLORS.length];
      return {
        id: point.id,
        label: point.label || `Item ${index + 1}`,
        value,
        color
      };
    });

    const total = Math.max(
      pieData.reduce((sum, item) => sum + item.value, 0),
      1
    );

    let cumulative = 0;
    const gradientSegments = pieData
      .map((item) => {
        const start = (cumulative / total) * 360;
        cumulative += item.value;
        const end = (cumulative / total) * 360;
        return `${item.color} ${start}deg ${end}deg`;
      })
      .join(', ');

    return (
      <div className="chart-visual chart-visual-pie">
        {chartTitle && <div className="chart-title">{chartTitle}</div>}
        <div
          className="chart-pie"
          style={{ background: `conic-gradient(${gradientSegments})` }}
        />
        <div className="chart-legend chart-legend-vertical">
          {pieData.map((item) => (
            <div key={item.id} className="chart-legend-item">
              <span
                className="chart-legend-swatch"
                style={{ backgroundColor: item.color }}
              />
              <span className="chart-legend-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // For other chart types (bar, line, etc.)
  return (
    <div className="chart-visual">
      {chartTitle && <div className="chart-title">{chartTitle}</div>}
      <div className="chart-content">
        <div className="chart-y-axis">{axisLabels.y}</div>
        <div className="chart-main">
          <div className="chart-bars">
            {data.map((point, pointIndex) => (
              <div key={point.id} className="chart-bar-group">
                {series.map((seriesItem, seriesIndex) => (
                  <div
                    key={`${point.id}-${seriesItem.id}`}
                    className="chart-bar"
                    style={{
                      height: `${(point.values[seriesItem.id] / 100) * 100}%`,
                      backgroundColor:
                        seriesItem.color || CHART_SERIES_COLORS[seriesIndex % CHART_SERIES_COLORS.length]
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="chart-x-axis">
            {data.map((point) => (
              <div key={point.id} className="chart-x-tick">
                {point.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      {renderLegend('horizontal')}
    </div>
  );
};

const Slideshow = ({ slides, currentSlide, setCurrentSlide, onExit }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedChartData, setSelectedChartData] = useState(null);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [scaledDimensions, setScaledDimensions] = useState({
    width: SLIDE_BASE_WIDTH,
    height: SLIDE_BASE_HEIGHT
  });

  const handleChartClick = (chart) => {
    if (chart.chartType === 'pie') return;
    setSelectedChartData({
      ...normalizeChartStructure(chart),
      chartType: chart.chartType || 'bar',
      title: chart.title || ''
    });
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
          }
          break;
        case 'ArrowRight':
          if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen().catch(console.error);
          } else if (onExit) {
            onExit();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide, slides.length, isFullscreen, onExit, setCurrentSlide]);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const updateScale = () => {
      if (!stageRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = stageRef.current;
      if (!clientWidth || !clientHeight) {
        return;
      }
      const nextScale = Math.min(
        clientWidth / SLIDE_BASE_WIDTH,
        clientHeight / SLIDE_BASE_HEIGHT
      );
      const safeScale = nextScale > 0 ? nextScale : 1;
      setScale(safeScale);
      setScaledDimensions({
        width: SLIDE_BASE_WIDTH * safeScale,
        height: SLIDE_BASE_HEIGHT * safeScale
      });
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [currentSlide, slides.length]);

  const slide = slides[currentSlide];
  if (!slide) return null;

  return (
    <div className="slideshow-container">
      <div className="slideshow-header">
        <div className="slideshow-controls">
          <button onClick={prevSlide} disabled={currentSlide === 0}>
            Previous
          </button>
          <span>
            Slide {currentSlide + 1} of {slides.length}
          </span>
          <button onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
            Next
          </button>
        </div>
        <div className="slideshow-actions">
          <button onClick={toggleFullscreen} className="fullscreen-button">
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button onClick={onExit} className="exit-button">
            Exit
          </button>
        </div>
      </div>

      <div className="slideshow-stage" ref={stageRef}>
        <div
          className="slideshow-slide-wrapper"
          style={{
            width: `${scaledDimensions.width}px`,
            height: `${scaledDimensions.height}px`
          }}
        >
          <div
            className="slideshow-slide"
            style={{
              backgroundColor: slide.background || '#111827',
              width: SLIDE_BASE_WIDTH,
              height: SLIDE_BASE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          >
            <div className="slide-content-container">
              {slide.content?.map((element) => (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x || 0}px`,
                    top: `${element.y || 0}px`,
                    width: `${element.width || 200}px`,
                    height: `${element.height || 100}px`,
                    zIndex: element.zIndex || 1
                  }}
                >
                  {element.type === 'text' && (
                    <div
                      className="slideshow-text-element"
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${element.fontSize || 16}px`,
                        fontFamily: element.fontFamily || 'Arial, sans-serif',
                        color: element.color || '#ffffff',
                        fontWeight: element.fontWeight || 'normal',
                        fontStyle: element.italic ? 'italic' : 'normal',
                        textDecoration: element.underline ? 'underline' : 'none',
                        padding: 0,
                        boxSizing: 'border-box',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        textAlign: element.textAlign || 'left',
                        lineHeight: 1.4,
                        backgroundColor: element.backgroundColor
                          ? `rgba(${hexToRgba(element.backgroundColor, 0.8)})`
                          : 'transparent',
                        borderRadius: element.borderRadius ? `${element.borderRadius}px` : 0,
                        textShadow: 'none'
                      }}
                      dangerouslySetInnerHTML={{ __html: element.text || '' }}
                    />
                  )}

                  {element.type === 'shape' && (
                    <div
                      className="slideshow-shape-element"
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: element.backgroundColor || '#000000',
                        borderRadius: element.shape === 'circle' ? '50%' : 0,
                        clipPath:
                          element.shape === 'triangle'
                            ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                            : element.shape === 'arrow'
                            ? 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)'
                            : element.shape === 'star'
                            ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                            : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: element.color || '#ffffff',
                        fontSize: '14px',
                        fontWeight: 500,
                        padding: '8px',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                        border: element.borderWidth
                          ? `${element.borderWidth}px solid ${element.borderColor || 'transparent'}`
                          : 'none'
                      }}
                    >
                      {element.text || ''}
                    </div>
                  )}

                  {element.type === 'chart' && (
                    <div
                      className="slideshow-chart-element"
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: element.background || '#ffffff',
                        borderRadius: '8px',
                        padding: '12px',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s'
                      }}
                      onClick={() => handleChartClick(element)}
                    >
                      {renderChartVisual(element)}
                    </div>
                  )}

                  {element.type === 'image' && element.src && (
                    <div
                      className="slideshow-image-element"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                        overflow: 'hidden',
                        borderRadius: '4px'
                      }}
                    >
                      <img
                        src={element.src}
                        alt={element.alt || ''}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          transform:
                            element.flipHorizontal || element.flipVertical
                              ? `scale(${element.flipHorizontal ? -1 : 1}, ${element.flipVertical ? -1 : 1})`
                              : undefined,
                          transformOrigin:
                            element.flipHorizontal || element.flipVertical
                              ? 'center center'
                              : undefined
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedChartData && (
        <div 
          className="chart-data-modal" 
          onClick={() => setSelectedChartData(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="chart-data-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '80%',
              maxHeight: '80%',
              overflow: 'auto',
              position: 'relative'
            }}
          >
            <div 
              className="chart-data-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e5e7eb'
              }}
            >
              <h3 style={{ margin: 0 }}>
                {selectedChartData.chartType?.toUpperCase()} Chart Data
              </h3>
              <button 
                onClick={() => setSelectedChartData(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  '&:hover': {
                    color: '#374151'
                  }
                }}
              >
                ×
              </button>
            </div>
            <div className="chart-data-body">
              {selectedChartData.series && selectedChartData.series.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
                          Category
                        </th>
                        {selectedChartData.series.map((series) => (
                          <th 
                            key={series.id}
                            style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span 
                                style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '2px',
                                  backgroundColor: series.color || '#1a73e8'
                                }}
                              />
                              {series.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChartData.data && selectedChartData.data.map((point, index) => (
                        <tr 
                          key={point.id || index}
                          style={{
                            '&:hover': {
                              backgroundColor: '#f9fafb'
                            }
                          }}
                        >
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
                            {point.label || `Category ${index + 1}`}
                          </td>
                          {selectedChartData.series.map((series) => (
                            <td 
                              key={`${point.id || index}-${series.id}`}
                              style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}
                            >
                              {point.values?.[series.id] ?? 0}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Slideshow;
