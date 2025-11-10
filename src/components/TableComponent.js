import React, { useState, useCallback, useRef, useEffect } from 'react';
import './TableComponent.css';

const TableComponent = ({ 
  element, 
  onUpdate, 
  onDelete,
  isSelected = false
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [tableData, setTableData] = useState(element.tableData || {
    rows: 3,
    cols: 3,
    cells: Array(3).fill(null).map(() => Array(3).fill('')),
    headerRow: true,
    headerCol: false,
    borderStyle: 'all',
    borderColor: '#d1d5db',
    headerBgColor: '#f3f4f6',
    cellBgColor: '#ffffff',
    textColor: '#111827',
    fontSize: 14,
    cellPadding: 8,
    colWidths: Array(3).fill(100),
    rowHeights: Array(3).fill(40)
  });
  const inputRef = useRef(null);
  const [resizing, setResizing] = useState(null);

  useEffect(() => {
    if (element.tableData) {
      const data = element.tableData;
      // Initialize colWidths and rowHeights if not present
      if (!data.colWidths) {
        data.colWidths = Array(data.cols).fill(100);
      }
      if (!data.rowHeights) {
        data.rowHeights = Array(data.rows).fill(40);
      }
      setTableData(data);
    }
  }, [element.tableData]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleCellClick = useCallback((rowIndex, colIndex, event) => {
    if (!isSelected) return;
    event.stopPropagation();
    setEditingCell({ row: rowIndex, col: colIndex });
  }, [isSelected]);

  const handleCellChange = useCallback((rowIndex, colIndex, value) => {
    const newCells = tableData.cells.map((row, rIdx) =>
      row.map((cell, cIdx) => 
        rIdx === rowIndex && cIdx === colIndex ? value : cell
      )
    );
    
    const updatedTableData = { ...tableData, cells: newCells };
    setTableData(updatedTableData);
    onUpdate({ ...element, tableData: updatedTableData });
  }, [tableData, element, onUpdate]);

  const handleCellBlur = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleKeyDown = useCallback((event, rowIndex, colIndex) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Move to next row
      if (rowIndex < tableData.rows - 1) {
        setEditingCell({ row: rowIndex + 1, col: colIndex });
      } else {
        setEditingCell(null);
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      // Move to next cell
      if (event.shiftKey) {
        // Shift+Tab: Move to previous cell
        if (colIndex > 0) {
          setEditingCell({ row: rowIndex, col: colIndex - 1 });
        } else if (rowIndex > 0) {
          setEditingCell({ row: rowIndex - 1, col: tableData.cols - 1 });
        }
      } else {
        // Tab: Move to next cell
        if (colIndex < tableData.cols - 1) {
          setEditingCell({ row: rowIndex, col: colIndex + 1 });
        } else if (rowIndex < tableData.rows - 1) {
          setEditingCell({ row: rowIndex + 1, col: 0 });
        } else {
          setEditingCell(null);
        }
      }
    } else if (event.key === 'ArrowUp' && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      if (rowIndex > 0) {
        setEditingCell({ row: rowIndex - 1, col: colIndex });
      }
    } else if (event.key === 'ArrowDown' && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      if (rowIndex < tableData.rows - 1) {
        setEditingCell({ row: rowIndex + 1, col: colIndex });
      }
    } else if (event.key === 'ArrowLeft' && !event.shiftKey && !event.ctrlKey) {
      // Check if cursor is at the start of the input
      const input = event.target;
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        event.preventDefault();
        if (colIndex > 0) {
          setEditingCell({ row: rowIndex, col: colIndex - 1 });
        }
      }
    } else if (event.key === 'ArrowRight' && !event.shiftKey && !event.ctrlKey) {
      // Check if cursor is at the end of the input
      const input = event.target;
      const textLength = input.value.length;
      if (input.selectionStart === textLength && input.selectionEnd === textLength) {
        event.preventDefault();
        if (colIndex < tableData.cols - 1) {
          setEditingCell({ row: rowIndex, col: colIndex + 1 });
        }
      }
    } else if (event.key === 'Escape') {
      setEditingCell(null);
    }
  }, [tableData.rows, tableData.cols]);

  const isHeaderRow = (rowIndex) => tableData.headerRow && rowIndex === 0;
  const isHeaderCol = (colIndex) => tableData.headerCol && colIndex === 0;

  const handleColumnResize = useCallback((colIndex, newWidth) => {
    if (!tableData.colWidths) return;
    const updatedColWidths = [...tableData.colWidths];
    updatedColWidths[colIndex] = Math.max(50, newWidth);
    const updatedTableData = { ...tableData, colWidths: updatedColWidths };
    setTableData(updatedTableData);
    onUpdate({ ...element, tableData: updatedTableData });
  }, [tableData, element, onUpdate]);

  const handleRowResize = useCallback((rowIndex, newHeight) => {
    if (!tableData.rowHeights) return;
    const updatedRowHeights = [...tableData.rowHeights];
    updatedRowHeights[rowIndex] = Math.max(30, newHeight);
    const updatedTableData = { ...tableData, rowHeights: updatedRowHeights };
    setTableData(updatedTableData);
    onUpdate({ ...element, tableData: updatedTableData });
  }, [tableData, element, onUpdate]);

  const handleResizeStart = useCallback((type, index, startPos) => {
    setResizing({ type, index, startPos });
  }, []);

  const handleResizeMove = useCallback((e) => {
    if (!resizing) return;
    
    const delta = resizing.type === 'col' 
      ? e.clientX - resizing.startPos
      : e.clientY - resizing.startPos;
    
    if (resizing.type === 'col') {
      const currentWidth = tableData.colWidths[resizing.index];
      handleColumnResize(resizing.index, currentWidth + delta);
    } else {
      const currentHeight = tableData.rowHeights[resizing.index];
      handleRowResize(resizing.index, currentHeight + delta);
    }
    
    setResizing({ ...resizing, startPos: resizing.type === 'col' ? e.clientX : e.clientY });
  }, [resizing, tableData, handleColumnResize, handleRowResize]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  const getCellStyle = (rowIndex, colIndex) => {
    const isHeader = isHeaderRow(rowIndex) || isHeaderCol(colIndex);
    
    let borderStyle = {};
    if (tableData.borderStyle === 'all') {
      borderStyle = {
        border: `1px solid ${tableData.borderColor}`,
      };
    } else if (tableData.borderStyle === 'outer') {
      borderStyle = {
        borderTop: rowIndex === 0 ? `1px solid ${tableData.borderColor}` : 'none',
        borderBottom: rowIndex === tableData.rows - 1 ? `1px solid ${tableData.borderColor}` : 'none',
        borderLeft: colIndex === 0 ? `1px solid ${tableData.borderColor}` : 'none',
        borderRight: colIndex === tableData.cols - 1 ? `1px solid ${tableData.borderColor}` : 'none',
      };
    }

    // Safe access to colWidths and rowHeights with fallback values
    const colWidth = tableData.colWidths?.[colIndex] || 100;
    const rowHeight = tableData.rowHeights?.[rowIndex] || 40;

    return {
      ...borderStyle,
      backgroundColor: isHeader ? tableData.headerBgColor : tableData.cellBgColor,
      color: tableData.textColor,
      fontSize: `${tableData.fontSize}px`,
      padding: `${tableData.cellPadding}px`,
      fontWeight: isHeader ? 600 : 400,
      textAlign: 'left',
      verticalAlign: 'middle',
      position: 'relative',
      width: `${colWidth}px`,
      height: `${rowHeight}px`,
      minWidth: '50px',
      minHeight: '30px',
      cursor: isSelected ? 'text' : 'default'
    };
  };

  const renderCell = (rowIndex, colIndex) => {
    const cellValue = tableData.cells[rowIndex]?.[colIndex] || '';
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          className="table-cell-input"
          value={cellValue}
          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: '2px solid #3b82f6',
            backgroundColor: 'transparent',
            color: tableData.textColor,
            fontSize: `${tableData.fontSize}px`,
            padding: `${tableData.cellPadding}px`,
            fontFamily: 'inherit'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    return (
      <div 
        className="table-cell-content"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {cellValue || (isSelected ? '\u00A0' : '')}
      </div>
    );
  };

  return (
    <div className="table-component-wrapper">
      {isSelected && typeof onDelete === 'function' && (
        <button
          type="button"
          className="table-floating-delete"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(element.id);
          }}
          aria-label="Delete table"
        >
          Delete
        </button>
      )}
      <div 
        className={`table-container ${isSelected ? 'selected' : ''}`}
        style={{
          width: '100%',
          height: 'auto',
          overflow: 'visible',
          userSelect: isSelected ? 'text' : 'none'
        }}
      >
        <table 
          className="presentation-table"
          style={{
            borderCollapse: 'collapse',
            tableLayout: 'auto'
          }}
        >
          <tbody>
            {Array(tableData.rows).fill(null).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array(tableData.cols).fill(null).map((_, colIndex) => (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    style={getCellStyle(rowIndex, colIndex)}
                    onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                    onDoubleClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                  >
                    {renderCell(rowIndex, colIndex)}
                    {/* Column resize handle */}
                    {isSelected && colIndex < tableData.cols - 1 && (
                      <div
                        className="col-resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart('col', colIndex, e.clientX);
                        }}
                      />
                    )}
                    {/* Row resize handle */}
                    {isSelected && rowIndex < tableData.rows - 1 && colIndex === 0 && (
                      <div
                        className="row-resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart('row', rowIndex, e.clientY);
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(TableComponent, (prevProps, nextProps) => {
  return (
    prevProps.element?.id === nextProps.element?.id &&
    prevProps.element?.tableData === nextProps.element?.tableData &&
    prevProps.isSelected === nextProps.isSelected
  );
});
