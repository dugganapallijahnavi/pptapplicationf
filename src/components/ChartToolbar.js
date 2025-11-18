import React, { useEffect, useMemo, useState } from 'react';
import './ChartToolbar.css';

const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: 'Bar' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'columnLine', label: 'Column + Line' }
];

const ChartToolbar = ({
  element,
  position = { x: 0, y: 0 },
  isVisible = false,
  onChangeType,
  onDelete,
  onDuplicate,
  onOpenMore,
  onDismiss
}) => {
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    if (!element) {
      return;
    }
    setChartType(element.chartType || 'bar');
  }, [element]);

  const toolbarPosition = useMemo(() => {
    const offsetTop = Math.max((position?.y ?? 0) - 48, 8);
    return {
      left: position?.x ?? 0,
      top: offsetTop
    };
  }, [position?.x, position?.y]);

  if (!isVisible || !element) {
    return null;
  }

  const handleTypeChange = (event) => {
    const newType = event.target.value;
    setChartType(newType);
    if (onChangeType && element) {
      onChangeType(element.id, newType);
    }
  };

  const handleMouseLeave = (event) => {
    const next = event.relatedTarget;
    if (next && typeof next.closest === 'function' && next.closest('.chart-toolbar-wrapper')) {
      return;
    }
    onDismiss?.();
  };

  return (
    <div
      className="chart-toolbar-wrapper"
      style={{
        left: toolbarPosition.left,
        top: toolbarPosition.top,
        transform: 'translateX(-50%)'
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div className="chart-toolbar-inline">
        <select
          className="chart-type-select"
          value={chartType}
          onChange={handleTypeChange}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {CHART_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="chart-toolbar-button duplicate"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate?.(element.id);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title="Duplicate"
        >
          ⧉
        </button>

        <button
          type="button"
          className="chart-toolbar-button delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.(element.id);
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          Delete
        </button>

        <div className="toolbar-tooltip">
          <button
            type="button"
            className="chart-toolbar-button more"
            onClick={(event) => {
              event.stopPropagation();
              onOpenMore?.(element);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="More actions"
          >
            ⋮
          </button>
          <span className="toolbar-tooltip__bubble">More actions</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChartToolbar, (prevProps, nextProps) => {
  // Prevent re-render if element and position haven't changed
  return (
    prevProps.element?.id === nextProps.element?.id &&
    prevProps.element?.chartType === nextProps.element?.chartType &&
    prevProps.position?.x === nextProps.position?.x &&
    prevProps.position?.y === nextProps.position?.y &&
    prevProps.isVisible === nextProps.isVisible
  );
});
