import React, {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react';
import { Rnd } from 'react-rnd';
import './SlideEditor.css';
import './ChartStyles.css';
import ChartComponent from './ChartComponent';
import TextToolbar from './TextToolbar';
import ChartToolbar from './ChartToolbar';

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
);

const TEXT_STYLES = {
  heading:   { label: 'Heading',   fontSize: 50, fontWeight: 600 },
  title:     { label: 'Title',     fontSize: 40, fontWeight: 500 },
  paragraph: { label: 'Paragraph', fontSize: 20, fontWeight: 400 }
};

const CHART_SERIES_COLORS = ['#2563eb','#f97316','#34d399','#fbbf24','#c084fc','#f472b6'];

const MAX_IMAGE_CANVAS_RATIO = 0.72;
/* keep your actual default; left as-is */
const DEFAULT_BACKGROUND = '#050505';

/* WIDER defaults so text doesn’t crowd/overflow before we can auto-grow */
const MIN_TEXT_WIDTH  = 220;   // was 120
const MIN_TEXT_HEIGHT = 80;    // keep a readable minimum line-height area
const MIN_ELEMENT_SIZE = 60;
const MIN_CHART_HEIGHT = 120;

const createSeriesId   = () => `chart-series-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createCategoryId = () => `chart-category-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const hexToRgba = (hex, a = 1) => {
  const s = hex.replace('#',''); if (s.length !== 6) return hex;
  const v = parseInt(s,16); const r=(v>>16)&255, g=(v>>8)&255, b=v&255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const createChartSeries = (name, color) => ({ id: createSeriesId(), name, color });
const createChartPoint  = (label, seriesList, defaults = []) => {
  const values = (seriesList||[]).reduce((acc, series, i)=>{
    const n = Number(defaults?.[i]); acc[series.id] = Number.isFinite(n)? n : 0; return acc;
  },{});
  return { id: createCategoryId(), label, values };
};

const SlideEditor = ({ slide, updateSlide, insertAction, onInsertActionHandled }) => {
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [isAddingText,  setIsAddingText]  = useState(false);
  const [isAddingShape, setIsAddingShape] = useState(false);
  const [isAddingChart, setIsAddingChart] = useState(false);
  const [toolbarPosition, setToolbarPosition]         = useState(null);
  const [shapeToolbarPosition, setShapeToolbarPosition] = useState(null);
  const [chartToolbarPosition, setChartToolbarPosition] = useState(null);
  const [draggingElementId, setDraggingElementId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [chartEditorId, setChartEditorId] = useState(null);

  const canvasRef = useRef(null);
  const elementRefs = useRef({});
  const isResizingRef = useRef(false);
  const fileInputRef = useRef(null);
  const imageActionRef = useRef(null);
  const lastSlideIdRef = useRef(null);

  const currentBackground = slide.background || DEFAULT_BACKGROUND;

  const computeFallbackToolbarPosition = (el) => {
    if (!el) return null;
    const originX = Number.isFinite(el.x) ? el.x : 0;
    const originY = Number.isFinite(el.y) ? el.y : 0;
    const elementWidth = Number.isFinite(el.width) ? el.width : 0;
    return { left: originX + elementWidth / 2, top: Math.max(8, originY - 28) };
  };

  const selectedElement = useMemo(
    () => slide.content.find((i) => i.id === selectedElementId) || null,
    [slide.content, selectedElementId]
  );

  useEffect(() => {
    if (!selectedElement) return;
    if (!slide.content.some((i) => i.id === selectedElement.id)) setSelectedElementId(null);
  }, [slide.content, selectedElement]);

  useEffect(() => { if (editingTextId && editingTextId !== selectedElementId) setEditingTextId(null); },
    [editingTextId, selectedElementId]);

  const focusTextElement = useCallback((elementId, attempt = 0) => {
    if (!elementId) return;
    const tryFocus = () => {
      const wrapper = elementRefs.current[elementId];
      if (!wrapper) { if (attempt < 6) setTimeout(()=>focusTextElement(elementId, attempt+1), 32); return; }
      const editable = wrapper.querySelector('[data-text-editable="true"]');
      if (!editable) { if (attempt < 6) setTimeout(()=>focusTextElement(elementId, attempt+1), 32); return; }
      if (editable !== document.activeElement) editable.focus({ preventScroll: false });
      const sel = window.getSelection?.(); if (sel) { sel.removeAllRanges(); const r = document.createRange(); r.selectNodeContents(editable); r.collapse(false); sel.addRange(r); }
    };
    (window.requestAnimationFrame ? window.requestAnimationFrame(tryFocus) : tryFocus());
  }, []);

  useEffect(() => {
    if (!slide) return;
    const currentSlideId = slide.id;
    if (!currentSlideId || lastSlideIdRef.current === currentSlideId) return;
    lastSlideIdRef.current = currentSlideId;

    const firstText = slide.content?.find((i)=>i.type==='text');
    if (firstText){ setSelectedElementId(firstText.id); setEditingTextId(firstText.id); focusTextElement(firstText.id); }
    else { setSelectedElementId(null); setEditingTextId(null); }
  }, [focusTextElement, slide]);

  /* -------- Adders -------- */
  const addTextBox = useCallback((x,y)=>{
    const newText = {
      id: Date.now(), type: 'text',
      text: 'Click to edit text',
      x: Math.max(32, x - 120), y: Math.max(32, y - 30),
      width: 260, height: MIN_TEXT_HEIGHT,
      fontSize: TEXT_STYLES.paragraph.fontSize,
      fontFamily: 'Georgia, serif',
      fontWeight: TEXT_STYLES.paragraph.fontWeight,
      textStyle: 'paragraph',
      color: '#333', textAlign: 'left',
      bold: false, italic: false, underline: false
    };
    updateSlide({ ...slide, content: [...slide.content, newText] });
    setSelectedElementId(newText.id); setEditingTextId(newText.id); focusTextElement(newText.id);
    setIsAddingText(false); setIsAddingShape(false); setIsAddingChart(false);
  }, [focusTextElement, slide, updateSlide]);

  const addShape = useCallback((x,y)=>{
    const newShape = { id: Date.now(), type:'shape', shape:'circle',
      x: Math.max(32, x-60), y: Math.max(32, y-60), width:120, height:120,
      color:'#1a73e8', borderColor:'#1a73e8', borderWidth:2, opacity: 1
    };
    updateSlide({ ...slide, content: [...slide.content, newShape] });
    setSelectedElementId(newShape.id); setIsAddingShape(false); setIsAddingText(false); setIsAddingChart(false);
  }, [slide, updateSlide]);

  const addChart = useCallback((x,y)=>{
    const p = CHART_SERIES_COLORS[0], s = CHART_SERIES_COLORS[1];
    const defaultSeries = [createChartSeries('Science', p), createChartSeries('Math', s)];
    const seeds = [[82,78],[88,84],[64,58],[68,62],[94,88]];
    const labels = ['Sachin','Sujay','Shivam','Manoj','Amraditya'];
    const data = labels.map((l,i)=>createChartPoint(l, defaultSeries, seeds[i]));
    const newChart = {
      id:Date.now(), type:'chart', chartType:'bar',
      x: Math.max(32, x-120), y: Math.max(32, y-80),
      width: 260, height: 180,
      title:'Chart Title', accentColor:p, background: hexToRgba(p, .12),
      series: defaultSeries, data
    };
    updateSlide({ ...slide, content:[...slide.content, newChart] });
    setSelectedElementId(newChart.id); setIsAddingChart(false); setIsAddingShape(false); setIsAddingText(false);
  }, [slide, updateSlide]);

  /* -------- Update helpers -------- */
  const updateElement = useCallback((id, updates)=>{
    const updated = slide.content.map((it)=> it.id===id ? { ...it, ...updates } : it );
    updateSlide({ ...slide, content: updated });
  }, [slide, updateSlide]);

  /* ---- Images (unchanged) ---- */
  const canvasRefRect = () => canvasRef.current?.getBoundingClientRect();

  const addImageElement = useCallback((src, w0, h0, alt)=>{
    if (!src) return;
    const rect = canvasRefRect();
    let width = w0 || 320, height = h0 || 200;
    if (rect && w0 && h0){
      const ws = (rect.width  * MAX_IMAGE_CANVAS_RATIO) / w0;
      const hs = (rect.height * MAX_IMAGE_CANVAS_RATIO) / h0;
      const s = Math.min(ws, hs, 1); width = Math.max(64, w0*s); height = Math.max(64, h0*s);
    }else if(rect){ width = Math.min(width, rect.width * MAX_IMAGE_CANVAS_RATIO); height = Math.min(height, rect.height * MAX_IMAGE_CANVAS_RATIO); }
    const aspect = (w0 && h0 && h0!==0) ? (w0/h0) : (width/Math.max(height,1));
    let x = rect ? (rect.width - width)/2 : 160;
    let y = rect ? (rect.height - height)/2 : 120;
    if (rect){ x = Math.max(0, Math.min(x, rect.width - width)); y = Math.max(0, Math.min(y, rect.height - height)); }
    const img = { id:Date.now(), type:'image', src, x, y, width, height, aspectRatio: aspect, alt: alt || 'Inserted image' };
    updateSlide({ ...slide, content:[...slide.content, img] }); setSelectedElementId(img.id);
  }, [updateSlide, slide]);

  /* ---- Selection / drag / resize ---- */
  const handleElementMouseDown = useCallback((e,id)=>{ e.stopPropagation(); setSelectedElementId(id); }, []);
  const handleDragStart = useCallback((id)=>{ setSelectedElementId(id); setDraggingElementId(id); setEditingTextId(c=>c===id?null:c); document.body.style.userSelect='none'; document.body.style.cursor='grabbing'; }, []);
  const handleDragStop  = useCallback((id,pos)=>{ setDraggingElementId(null); document.body.style.userSelect=''; document.body.style.cursor=''; updateElement(id,{ x:Math.round(pos.x), y:Math.round(pos.y) }); }, [updateElement]);

  const handleResizeStart = useCallback((id)=>{ isResizingRef.current=true; setSelectedElementId(id); setDraggingElementId(id); setEditingTextId(c=>c===id?null:c); document.body.style.cursor='nwse-resize'; document.body.style.userSelect='none'; }, []);
  const handleResizeStop  = useCallback((id, direction, ref, position)=>{
    const target = slide.content.find(i=>i.id===id) || null;
    const minW = target?.type==='text' ? MIN_TEXT_WIDTH : MIN_ELEMENT_SIZE;
    const minH = target?.type==='text' ? MIN_TEXT_HEIGHT : (target?.type==='chart' ? MIN_CHART_HEIGHT : MIN_ELEMENT_SIZE);
    const w = Math.round(Number.parseFloat(ref.style.width)  || minW);
    const h = Math.round(Number.parseFloat(ref.style.height) || minH);

    isResizingRef.current=false; setDraggingElementId(null); document.body.style.cursor=''; document.body.style.userSelect='';
    const prevL = Number.isFinite(target?.x)?target.x:0; const prevT = Number.isFinite(target?.y)?target.y:0;
    const prevW = Number.isFinite(target?.width)?target.width:minW; const prevH = Number.isFinite(target?.height)?target.height:minH;
    const fromW = String(direction||'').toLowerCase().includes('left');
    const fromN = String(direction||'').toLowerCase().includes('top');
    const right = prevL + prevW; const bottom = prevT + prevH;
    const nextX = fromW ? Math.max(0, right  - w) : Math.round(position.x);
    const nextY = fromN ? Math.max(0, bottom - h) : Math.round(position.y);

    updateElement(id, { width: Math.max(minW, w), height: Math.max(minH, h), x: nextX, y: nextY });
  }, [slide.content, updateElement]);

  const handleCanvasClick = useCallback((e)=>{
    if (e.target.closest('.text-floating-toolbar') || e.target.closest('.shape-floating-toolbar') || e.target.closest('.chart-floating-toolbar') || e.target.closest('.element-properties')) return;
    const rect = canvasRefRect(); if (!rect) return;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (isAddingText)  return addTextBox(x,y);
    if (isAddingShape) return addShape(x,y);
    if (isAddingChart) return addChart(x,y);
    setSelectedElementId(null);
  }, [addChart, addShape, addTextBox, isAddingChart, isAddingShape, isAddingText]);

  /* ----- Toolbar positioners (unchanged logic) ----- */
  const recomputeToolbarPosition = useCallback(()=>{
    if (!selectedElement){ setToolbarPosition(null); setShapeToolbarPosition(null); setChartToolbarPosition(null); return; }
    const canvasNode = canvasRef.current; if (!canvasNode){ setToolbarPosition(null); setShapeToolbarPosition(null); setChartToolbarPosition(null); return; }
    const node = elementRefs.current[selectedElement.id];
    if (!node){
      const fb = computeFallbackToolbarPosition(selectedElement);
      if (selectedElement.type==='text'){ if (!isResizingRef.current) setToolbarPosition(fb||null); setShapeToolbarPosition(null); setChartToolbarPosition(null); }
      else if (selectedElement.type==='shape'){ setShapeToolbarPosition(fb||null); setToolbarPosition(null); setChartToolbarPosition(null); }
      else if (selectedElement.type==='chart'){ setChartToolbarPosition(fb||null); setToolbarPosition(null); setShapeToolbarPosition(null); }
      return;
    }
    const er = node.getBoundingClientRect(), cr = canvasNode.getBoundingClientRect();
    const clamped = { top: Math.max(8, er.top - cr.top - 28), left: er.left - cr.left + er.width/2 };
    if (selectedElement.type==='text'){ if (!isResizingRef.current) setToolbarPosition(clamped); setShapeToolbarPosition(null); setChartToolbarPosition(null); }
    else if (selectedElement.type==='shape'){ setShapeToolbarPosition(clamped); setToolbarPosition(null); setChartToolbarPosition(null); }
    else if (selectedElement.type==='chart'){ setChartToolbarPosition(clamped); setToolbarPosition(null); setShapeToolbarPosition(null); }
  }, [selectedElement]);

  useEffect(()=>{ recomputeToolbarPosition(); }, [recomputeToolbarPosition, slide.content]);
  useEffect(()=>{ const h=()=>recomputeToolbarPosition(); window.addEventListener('resize',h); return ()=>window.removeEventListener('resize',h); },[recomputeToolbarPosition]);

  /* ---------- Text handling ---------- */
  const handleTextBlur = (e, el) => {
    const target = e.target;
    if (!target) {
      return;
    }
    const html = target.innerHTML || '';
    const plain = target.textContent || '';
    const measured = target.offsetHeight || el.height || MIN_TEXT_HEIGHT;
    const clamped = Math.max(MIN_TEXT_HEIGHT, Math.round(measured));
    updateElement(el.id, { text: html, plainText: plain, height: clamped });
  };

  /* Renderers */
  const renderElement = (el) => {
    if (el.type === 'text'){
      return (
        <div
          ref={(node)=>{
            if (!node) return;
            const measure = () => {
              const wrapper = node.closest('.slide-element-wrapper');
              if (!wrapper) return;
              const original = node.style.height;
              node.style.height = 'auto';
              const measured = node.scrollHeight;
              node.style.height = original;
              const clamped = Math.max(MIN_TEXT_HEIGHT, Math.round(measured));
              const current = el.height || MIN_TEXT_HEIGHT;
              if (Math.abs(clamped - current) > 2){
                requestAnimationFrame(()=> updateElement(el.id, { height: clamped }) );
              }
            };
            setTimeout(measure, 0);
          }}
          className={`editable-text ${el.id === selectedElementId ? 'selected' : ''}`}
          data-text-editable={el.id === selectedElementId}
          style={{
            fontFamily: el.fontFamily || 'Georgia, serif',
            fontSize:   el.fontSize   || 16,
            fontWeight: el.fontWeight || 400,
            color:      el.color      || '#333333',
            textAlign:  el.textAlign  || 'left',
            ...(el.italic && { fontStyle: 'italic' }),
            ...(el.underline && { textDecoration: 'underline' }),
            ...(el.strikethrough && { textDecoration: 'line-through' }),
            cursor: draggingElementId === el.id ? 'grabbing' : (editingTextId === el.id ? 'text' : 'grab')
          }}
          contentEditable={el.id === selectedElementId}
          suppressContentEditableWarning
          onFocus={()=> setEditingTextId(el.id)}
          onInput={(e)=>{
            const target = e.target;
            const wrapper = target.closest('.slide-element-wrapper');
            if (!wrapper) return;

            const original = target.style.height;
            target.style.height = 'auto';
            const measured = target.scrollHeight;
            target.style.height = original;
            const clamped = Math.max(MIN_TEXT_HEIGHT, Math.round(measured));
            const current = el.height || MIN_TEXT_HEIGHT;

            const updates = {
              text: target.innerHTML || '',
              plainText: target.textContent || ''
            };

            if (Math.abs(clamped - current) > 2){
              updates.height = clamped;
            }

            updateElement(el.id, updates);
          }}
          onBlur={(e)=>{ handleTextBlur(e, el); setEditingTextId(c=>c===el.id?null:c); }}
          dangerouslySetInnerHTML={{ __html: el.text || '' }}
        />
      );
    }

    if (el.type === 'shape'){
      const borderEnabled = el.borderEnabled !== false;
      const borderWidth = Number.isFinite(el.borderWidth) ? Math.max(0, el.borderWidth) : 0;
      const borderStyle = el.borderStyle || 'solid';
      const borderColor = el.borderColor || el.color || '#3b82f6';
      const resolvedBorder = borderEnabled && borderWidth > 0 ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none';

      const baseShapeStyle = {
        backgroundColor: el.color || '#3b82f6',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 500,
        overflow: 'hidden',
        border: resolvedBorder
      };

      if (el.shape === 'circle') {
        baseShapeStyle.borderRadius = '50%';
        baseShapeStyle.clipPath = 'none';
      } else if (el.shape === 'rectangle') {
        baseShapeStyle.borderRadius = 0;
        baseShapeStyle.clipPath = 'none';
      } else if (el.shape === 'triangle') {
        baseShapeStyle.borderRadius = 0;
        baseShapeStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
      } else if (el.shape === 'arrow') {
        baseShapeStyle.borderRadius = 0;
        baseShapeStyle.clipPath = 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)';
      } else if (el.shape === 'star') {
        baseShapeStyle.borderRadius = 0;
        baseShapeStyle.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
      } else if (el.shape === 'line') {
        baseShapeStyle.height = `${el.strokeWidth || 2}px`;
        baseShapeStyle.borderRadius = '999px';
      }

      return (
        <div
          className={`shape ${el.id === selectedElementId ? 'selected' : ''}`}
          style={baseShapeStyle}
        >
          {el.text || ''}
        </div>
      );
    }

    if (el.type === 'chart') {
      return (
        <div
          className={`chart-container ${el.id === selectedElementId ? 'selected' : ''}`}
          style={{
            backgroundColor: el.background || '#ffffff',
            borderRadius: '8px',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            padding: '12px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {renderChartVisual(el)}
        </div>
      );
    }

    if (el.type === 'image' && el.src) {
      return (
        <div
          className={`image-container ${el.id === selectedElementId ? 'selected' : ''}`}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            borderRadius: '4px'
          }}
        >
          <img
            src={el.src}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      );
    }

    return null;
  };

  const handleChartTypeChange = useCallback(
    (chartId, nextType) => {
      if (!chartId || !nextType) {
        return;
      }
      updateElement(chartId, { chartType: nextType });
    },
    [updateElement]
  );

  const handleChartTitleChange = useCallback(
    (chartId, nextTitle) => {
      const normalized = typeof nextTitle === 'string' ? nextTitle.trim() : '';
      updateElement(chartId, { title: normalized });
    },
    [updateElement]
  );

  const handleChartAccentChange = useCallback(
    (chartId, nextColor) => {
      if (!nextColor) {
        return;
      }
      updateElement(chartId, { accentColor: nextColor });
    },
    [updateElement]
  );

  const handleChartEditData = useCallback(
    (chartId) => {
      if (!chartId) {
        return;
      }
      setChartEditorId(chartId);
    },
    []
  );

  const handleTextUpdate = useCallback(
    (id, patch) => {
      updateElement(id, patch);
    },
    [updateElement]
  );

  const handleTextDelete = useCallback(() => {
    if (selectedElement && selectedElement.type === 'text') {
      deleteElement(selectedElement.id);
    }
  }, [deleteElement, selectedElement]);

  const renderTextToolbar = () =>
    (!selectedElement || selectedElement.type !== 'text' || !toolbarPosition)
      ? null
      : (
        <TextToolbar
          element={selectedElement}
          onUpdate={handleTextUpdate}
          onDelete={handleTextDelete}
          position={toolbarPosition}
          isVisible
        />
      );

  const renderShapeToolbar = () => null; // Placeholder for shape toolbar

  const renderChartToolbar = () =>
    (!selectedElement || selectedElement.type !== 'chart' || !chartToolbarPosition)
      ? null
      : (
        <ChartToolbar
          element={selectedElement}
          position={chartToolbarPosition}
          isVisible
          onChangeType={(type) => handleChartTypeChange(selectedElement.id, type)}
          onChangeTitle={(title) => handleChartTitleChange(selectedElement.id, title)}
          onChangeAccentColor={(color) => handleChartAccentChange(selectedElement.id, color)}
          onDelete={() => deleteElement(selectedElement.id)}
          onDismiss={() => setChartToolbarPosition(null)}
        />
      );

  const getNormalizedChartStructure = useCallback((chart)=>{ /* unchanged; omitted here for brevity in this snippet */ }, []);
  const renderChartVisual = (chart)=>{ /* unchanged from your version */ };

  const deleteElement = useCallback((id)=>{
    const updated = slide.content.filter((it)=> it.id !== id);
    updateSlide({ ...slide, content: updated });
    setSelectedElementId(null); setEditingTextId(null); setToolbarPosition(null);
  }, [slide, updateSlide]);

  const handleToggleFormat = useCallback((type)=>{
    if (!selectedElement || selectedElement.type !== 'text') return;
    if (type === 'bold'){
      const next = !selectedElement.bold;
      updateElement(selectedElement.id, { bold: next, fontWeight: next ? 700 : 400 });
    } else if (type === 'italic'){
      updateElement(selectedElement.id, { italic: !selectedElement.italic });
    } else if (type === 'underline'){
      updateElement(selectedElement.id, { underline: !selectedElement.underline });
    }
  }, [selectedElement, updateElement]);

  const renderSlideContent = () => {
    if (slide?.content?.length === 0){
      return (<div className="empty-slide"><p>Click "+" to add content to your slide</p></div>);
    }
    return (
      <div className="slide-content">
        {slide?.content?.map((el)=>{
          const isSelected = el.id === selectedElementId;
          const width  = Number.isFinite(el.width)  ? el.width  : (el.type==='chart'?320:260);
          const height = Number.isFinite(el.height) ? el.height : (el.type==='text'?MIN_TEXT_HEIGHT : el.type==='chart'?200 : 120);
          const x = Number.isFinite(el.x) ? el.x : 0;
          const y = Number.isFinite(el.y) ? el.y : 0;
          const minWidth  = el.type==='text' ? MIN_TEXT_WIDTH : MIN_ELEMENT_SIZE;
          const minHeight = el.type==='text' ? MIN_TEXT_HEIGHT : (el.type==='chart' ? MIN_CHART_HEIGHT : MIN_ELEMENT_SIZE);
          const lockAspectRatio = (el.type==='image' && el.maintainAspect) ? (Number.isFinite(el.aspectRatio) ? el.aspectRatio : true) : false;

          return (
            <Rnd key={el.id}
                 innerRef={(n)=>{ if (n) elementRefs.current[el.id] = n; else delete elementRefs.current[el.id]; }}
                 className={`slide-element-wrapper ${el.type} ${isSelected ? 'selected' : ''} ${draggingElementId===el.id ? 'dragging' : ''}`.trim()}
                 bounds="parent"
                 size={{ width, height }}
                 position={{ x, y }}
                 minWidth={minWidth}
                 minHeight={minHeight}
                 lockAspectRatio={lockAspectRatio}
                 disableDragging={editingTextId === el.id}
                 enableResizing={{ top:true, right:true, bottom:true, left:true, topLeft:true, topRight:true, bottomLeft:true, bottomRight:true }}
                 onMouseDown={(e)=> handleElementMouseDown(e, el.id)}
                 onClick={(e)=> handleElementMouseDown(e, el.id)}
                 onDragStart={()=> handleDragStart(el.id)}
                 onDragStop={(e,data)=> handleDragStop(el.id, data)}
                 onResizeStart={()=> handleResizeStart(el.id)}
                 onResizeStop={(e,dir,ref,delta,pos)=> handleResizeStop(el.id, dir, ref, pos)}
                 style={{ zIndex: el.zIndex || 1 }}>
              <div className="slide-element-content">{renderElement(el)}</div>
            </Rnd>
          );
        })}
        {(isAddingText || isAddingShape || isAddingChart) && (
          <div className="canvas-instruction">Click anywhere to add {isAddingText ? 'text' : isAddingShape ? 'shape' : 'chart'}</div>
        )}
        {renderTextToolbar()}
        {renderShapeToolbar()}
        {renderChartToolbar()}
      </div>
    );
  };

  return (
    <div className="slide-editor">
      <div className="canvas-container">
        <div className="canvas"
             ref={canvasRef}
             style={{ backgroundColor: currentBackground, position:'relative', overflow:'hidden', width:'100%', height:'100%', borderRadius:'8px', boxShadow:'0 4px 8px rgba(0,0,0,.1)' }}
             onClick={handleCanvasClick}>
          {renderSlideContent()}
        </div>
      </div>

      <input type="file" accept="image/*" ref={fileInputRef} style={{ display:'none' }} onChange={/* your existing handler */()=>{}} />
    </div>
  );
};

export default SlideEditor;
