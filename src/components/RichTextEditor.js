import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import { Extension } from '@tiptap/core';
import './RichTextEditor.css';

const EMPTY_PARAGRAPH = '<p></p>';

// Allow custom class attributes on list nodes for styling
const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class') || null,
        renderHTML: attributes => ({
          class: attributes.class || null
        })
      }
    };
  }
});

const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class') || null,
        renderHTML: attributes => ({
          class: attributes.class || null
        })
      }
    };
  }
});

const LineHeight = Extension.create({
  name: 'lineHeight',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'bulletList', 'orderedList'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return { style: `line-height: ${attributes.lineHeight}` };
            }
          }
        }
      }
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (value) =>
        ({ state, dispatch }) => {
          const { from, to } = state.selection;
          const tr = state.tr;
          let changed = false;
          const targetTypes = new Set(['paragraph', 'heading', 'bulletList', 'orderedList']);

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!targetTypes.has(node.type.name)) {
              return;
            }

            const attrs = {
              ...node.attrs,
              lineHeight: value
            };

            if (node.attrs.lineHeight === value) {
              return;
            }

            tr.setNodeMarkup(pos, undefined, attrs, node.marks);
            changed = true;
          });

          if (changed) {
            dispatch?.(tr);
            return true;
          }
          return false;
        }
    };
  }
});

const TextCase = Extension.create({
  name: 'textCase',

  addCommands() {
    const transformSelection = (transformer) => ({ state, dispatch }) => {
      const { from, to } = state.selection;
      if (from === to) {
        return false;
      }

      const tr = state.tr;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isText) {
          return;
        }
        const start = Math.max(from, pos);
        const end = Math.min(to, pos + node.nodeSize);
        const transformed = transformer(node.text?.slice(start - pos, end - pos) || '');
        tr.replaceRangeWith(start, end, state.schema.text(transformed, node.marks));
      });
      if (tr.docChanged) {
        dispatch?.(tr);
        return true;
      }
      return false;
    };

    return {
      toUpperCase: () => transformSelection((value) => value.toUpperCase()),
      toLowerCase: () => transformSelection((value) => value.toLowerCase()),
      toTitleCase: () =>
        transformSelection((value) =>
          value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        )
    };
  }
});

// Custom FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace('px', ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}px`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
});

// Custom FontFamily extension
const FontFamily = Extension.create({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: element => element.style.fontFamily?.replace(/['"]/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontFamily) {
                return {}
              }
              return {
                style: `font-family: ${attributes.fontFamily}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontFamily: fontFamily => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontFamily })
          .run()
      },
      unsetFontFamily: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontFamily: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
});

const RichTextEditor = React.memo(({
  element,
  isSelected,
  onContentChange,
  onFocus,
  onBlur,
  onEditorReady,
  placeholder = 'Write something',
  textScale = 1
}) => {
  const [, forceUpdate] = useState(0);
  const lastSyncedContentRef = useRef(element?.text || '');

  const editor = useEditor(
    {
      extensions: [
        Color.configure({ types: [TextStyle.name] }),
        TextStyle,
        FontSize,
        FontFamily,
        LineHeight,
        TextCase,
        Underline,
        TextAlign.configure({
          defaultAlignment: 'left',
          types: ['heading', 'paragraph']
        }),
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          bulletList: false,
          orderedList: false
        }),
        CustomBulletList.configure({ keepMarks: true, keepAttributes: true }),
        CustomOrderedList.configure({ keepMarks: true, keepAttributes: true }),
        Placeholder.configure({
          placeholder,
          includeChildren: true
        })
      ],
      content: element?.text || EMPTY_PARAGRAPH,
      editable: Boolean(isSelected),
      editorProps: {
        attributes: {
          class: 'tiptap-editor-content',
          'data-text-editable': 'true',
          spellcheck: 'false',
          translate: 'no'
        }
      },
      onUpdate: ({ editor: activeEditor }) => {
        if (!activeEditor) {
          return;
        }
        const html = activeEditor.getHTML();
        if (html === lastSyncedContentRef.current) {
          return;
        }
        lastSyncedContentRef.current = html;
        const plainText = activeEditor.getText();
        onContentChange?.(html, plainText);
      }
    },
    [element?.id]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    // Notify parent that editor is ready
    onEditorReady?.(editor);

    const handleFocus = () => {
      onFocus?.();
    };
    const handleBlur = () => {
      onBlur?.();
    };
    const handleSelectionUpdate = () => {
      forceUpdate((tick) => tick + 1);
    };

    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleSelectionUpdate);

    return () => {
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleSelectionUpdate);
    };
  }, [editor, onFocus, onBlur, onEditorReady]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(Boolean(isSelected));
    if (!isSelected) {
      editor.commands.blur();
      return;
    }
    if (!editor.isFocused) {
      editor.commands.focus('end');
    }
  }, [editor, isSelected]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const nextContent = element?.text || EMPTY_PARAGRAPH;
    if (nextContent === lastSyncedContentRef.current) {
      return;
    }
    lastSyncedContentRef.current = nextContent;
    editor.commands.setContent(nextContent, false);
  }, [editor, element?.text, element?.id]);

  const editorStyle = useMemo(() => {
    if (!element) {
      return {};
    }

    const decorations = [];
    if (element.underline) {
      decorations.push('underline');
    }
    if (element.strikethrough) {
      decorations.push('line-through');
    }

    const baseFontSize = element.fontSize || 18;
    const effectiveFontSize = Math.max(Math.round(baseFontSize * textScale), 10);

    return {
      fontFamily: element.fontFamily || 'Inter, sans-serif',
      fontSize: `${effectiveFontSize}px`,
      color: element.color || '#f9fafb',
      textAlign: element.textAlign || 'left',
      fontWeight: element.bold ? 700 : (element.fontWeight || 400),
      fontStyle: element.italic ? 'italic' : 'normal',
      textDecoration: decorations.join(' ') || 'none',
      lineHeight: element.lineHeight ? String(element.lineHeight) : '1.3'
    };
  }, [element, textScale]);

  if (!element) {
    return null;
  }

  return (
    <div className={`rich-text-editor ${isSelected ? 'is-selected' : ''}`} style={editorStyle}>
      <EditorContent editor={editor} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.element?.id === nextProps.element?.id &&
    prevProps.element?.text === nextProps.element?.text &&
    prevProps.element?.fontSize === nextProps.element?.fontSize &&
    prevProps.element?.fontFamily === nextProps.element?.fontFamily &&
    prevProps.element?.color === nextProps.element?.color &&
    prevProps.element?.textAlign === nextProps.element?.textAlign &&
    prevProps.element?.bold === nextProps.element?.bold &&
    prevProps.element?.italic === nextProps.element?.italic &&
    prevProps.element?.underline === nextProps.element?.underline &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.textScale === nextProps.textScale
  );
});

export default RichTextEditor;
