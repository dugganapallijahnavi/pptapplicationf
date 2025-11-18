import React, { useMemo, useState, useEffect, useRef } from 'react';
import './ImageToolbar.css';

const ImageToolbar = ({
  element,
  onDelete,
  onDuplicate,
  onFlip,
  onOpenMore,
  position,
  isVisible = false,
  onDismiss
}) => {
  const [showFlipMenu, setShowFlipMenu] = useState(false);
  const menuRef = useRef(null);

  const toolbarPosition = useMemo(() => {
    const offsetTop = Math.max((position?.y ?? 0) - 48, 8);
    return {
      left: position?.x ?? 0,
      top: offsetTop
    };
  }, [position?.x, position?.y]);

  useEffect(() => {
    if (!isVisible) {
      setShowFlipMenu(false);
    }
  }, [isVisible, element?.id]);

  useEffect(() => {
    if (!showFlipMenu) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowFlipMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFlipMenu]);

  if (!isVisible || !element) {
    return null;
  }

  return (
    <div
      className="image-toolbar-wrapper"
      style={{
        left: toolbarPosition.left,
        top: toolbarPosition.top,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="image-toolbar-inline">
        <button
          type="button"
          className="image-toolbar-duplicate"
          onClick={() => onDuplicate?.(element.id)}
          onMouseDown={(event) => event.stopPropagation()}
          title="Duplicate"
        >
          ⧉
        </button>
        <div className="image-toolbar-flip-group" ref={menuRef}>
          <button
            type="button"
            className={`image-toolbar-flip ${showFlipMenu ? 'active' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              setShowFlipMenu((prev) => !prev);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            title="Flip"
          >
            ↕↔
          </button>
          {showFlipMenu && (
            <div className="image-toolbar-flip-menu">
              <button
                type="button"
                onClick={() => {
                  onFlip?.(element.id, 'vertical');
                  setShowFlipMenu(false);
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                Flip Vertical
              </button>
              <button
                type="button"
                onClick={() => {
                  onFlip?.(element.id, 'horizontal');
                  setShowFlipMenu(false);
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                Flip Horizontal
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="image-toolbar-delete"
          onClick={() => onDelete?.(element.id)}
          onMouseDown={(event) => event.stopPropagation()}
        >
          Delete
        </button>

        <div className="toolbar-tooltip">
          <button
            type="button"
            className="image-toolbar-more"
            onClick={(event) => {
              event.stopPropagation();
              onOpenMore?.(element);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="More actions"
          >
            ⋮
          </button>
          <span className="toolbar-tooltip__bubble" role="status">More actions</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ImageToolbar, (prevProps, nextProps) => {
  return (
    prevProps.element?.id === nextProps.element?.id &&
    prevProps.position?.x === nextProps.position?.x &&
    prevProps.position?.y === nextProps.position?.y &&
    prevProps.isVisible === nextProps.isVisible
  );
});
