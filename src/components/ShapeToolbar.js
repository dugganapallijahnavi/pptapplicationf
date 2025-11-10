import React, { useEffect, useMemo, useState } from 'react';
import './ShapeToolbar.css';

const SHAPE_OPTIONS = [
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'circle', label: 'Circle' },
  { key: 'triangle', label: 'Triangle' },
  { key: 'arrow', label: 'Arrow' },
  { key: 'star', label: 'Star' }
];

const DEFAULT_SHAPE_COLOR = '#2563eb';

const sanitizeHex = (value) => {
  if (!value) {
    return DEFAULT_SHAPE_COLOR;
  }
  const prefixed = value.startsWith('#') ? value : '#'+value;
  if (/^#[0-9a-f]{6}$/i.test(prefixed)) {
    return prefixed.toUpperCase();
  }
  if (/^#?[0-9a-f]{3}$/i.test(value)) {
    const cleaned = value.replace('#', '');
    const expanded = cleaned
      .split('')
      .map((char) => char + char)
      .join('');
    return ('#'+expanded).toUpperCase();
  }
  return DEFAULT_SHAPE_COLOR;
};

const ShapeToolbar = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  position,
  isVisible = false,
  onDismiss
}) => {
  const [colorHex, setColorHex] = useState(DEFAULT_SHAPE_COLOR);
  const [shapeKey, setShapeKey] = useState('rectangle');

  useEffect(() => {
    if (!element) {
      return;
    }
    setColorHex(sanitizeHex(element.color));
    setShapeKey(element.shape || 'rectangle');
  }, [element]);

  const toolbarPosition = useMemo(() => {
    const offsetTop = Math.max((position?.y ?? 0) - 48, 8);
    return {
      left: position?.x ?? 0,
      top: offsetTop
    };
  }, [position?.x, position?.y]);

  const applyUpdate = (patch) => {
    if (!element || typeof onUpdate !== 'function') {
      return;
    }
    onUpdate(element.id, patch);
  };

  const handleShapeSelect = (shape) => {
    setShapeKey(shape);
    applyUpdate({ shape });
  };

  if (!isVisible || !element) {
    return null;
  }

  const handleMouseLeave = (event) => {
    const next = event.relatedTarget;
    if (
      next &&
      typeof next.closest === 'function' &&
      (next.closest('.shape-toolbar-wrapper') || next.closest('[data-shape-element="true"]'))
    ) {
      return;
    }
    onDismiss?.();
  };

  return (
    <div
      className="shape-toolbar-wrapper"
      style={{
        left: toolbarPosition.left,
        top: toolbarPosition.top,
        transform: 'translateX(-50%)'
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div className="shape-toolbar-inline">
        <select
          className="shape-select"
          value={shapeKey}
          onChange={(event) => handleShapeSelect(event.target.value)}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {SHAPE_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="color"
          className="shape-color-picker"
          value={sanitizeHex(colorHex)}
          onChange={(event) => {
            event.stopPropagation();
            const value = event.target.value.toUpperCase();
            setColorHex(value);
            applyUpdate({ color: value });
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          aria-label="Choose shape color"
        />

        <button
          type="button"
          className="shape-toolbar-duplicate"
          onClick={() => onDuplicate?.(element.id)}
          onMouseDown={(event) => event.stopPropagation()}
          title="Duplicate"
        >
          ⧉
        </button>

        <button
          type="button"
          className="shape-toolbar-delete"
          onClick={() => onDelete?.(element.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default React.memo(ShapeToolbar, (prevProps, nextProps) => {
  // Prevent re-render if element and position haven't changed
  return (
    prevProps.element?.id === nextProps.element?.id &&
    prevProps.element?.shape === nextProps.element?.shape &&
    prevProps.element?.color === nextProps.element?.color &&
    prevProps.position?.x === nextProps.position?.x &&
    prevProps.position?.y === nextProps.position?.y &&
    prevProps.isVisible === nextProps.isVisible
  );
});
