const uniqueId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const stripHtml = (value) => {
  if (!value) {
    return '';
  }
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const createTextElement = (text, overrides = {}) => ({
  id: uniqueId('text'),
  type: 'text',
  text,
  x: 160,
  y: 140,
  width: 520,
  fontSize: 32,
  fontFamily: '"Playfair Display", serif',
  fontWeight: 500,
  textStyle: 'title',
  color: '#111827',
  textAlign: 'left',
  bold: false,
  italic: false,
  underline: false,
  ...overrides,
  plainText:
    overrides.plainText ??
    stripHtml(
      typeof (overrides.text ?? text) === 'string' ? overrides.text ?? text : ''
    )
});

const createParagraphElement = (text, overrides = {}) =>
  createTextElement(text, {
    fontSize: 16,
    fontFamily: 'Georgia, serif',
    fontWeight: 400,
    textStyle: 'body',
    y: 300,
    color: '#1f2937',
    ...overrides
  });

const createCaptionElement = (text, overrides = {}) =>
  createParagraphElement(text, {
    fontSize: 14,
    color: '#374151',
    ...overrides
  });

export const DEFAULT_LAYOUT_ID = 'title';

export const SLIDE_LAYOUTS = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from an empty canvas.',
    background: '#ffffff',
    previewBlocks: [],
    createContent: () => []
  },
  {
    id: 'title',
    name: 'Title',
    description: 'Large title with space for a subtitle.',
    background: '#ffffff',
    previewBlocks: [
      {
        width: '80%',
        height: '18%',
        top: '22%',
        left: '10%',
        variant: 'title'
      },
      {
        width: '70%',
        height: '12%',
        top: '52%',
        left: '15%',
        variant: 'subtitle'
      }
    ],
    createContent: () => [
      createTextElement('Add a compelling headline', {
        x: 120,
        y: 150,
        width: 720,
        fontSize: 36,
        fontWeight: 600,
        textStyle: 'heading'
      }),
      createParagraphElement('Add a supporting subtitle', {
        x: 120,
        y: 320,
        width: 720,
        fontSize: 16,
        color: '#374151'
      })
    ]
  },
  {
    id: 'titleAndContent',
    name: 'Title & Body',
    description: 'Headline followed by body text.',
    background: '#ffffff',
    previewBlocks: [
      {
        width: '72%',
        height: '16%',
        top: '18%',
        left: '14%',
        variant: 'title'
      },
      {
        width: '72%',
        height: '32%',
        top: '48%',
        left: '14%',
        variant: 'body'
      }
    ],
    createContent: () => [
      createTextElement('Introduce your main idea', {
        y: 140,
        fontSize: 30,
        fontWeight: 600
      }),
      createParagraphElement(
        'Use this area to expand on your idea with supporting details and bullets.',
        {
          y: 300,
          width: 520,
          fontSize: 16,
          color: '#374151'
        }
      )
    ]
  },
  {
    id: 'twoColumn',
    name: 'Two Column',
    description: 'Title with two columns of text.',
    background: '#ffffff',
    previewBlocks: [
      {
        width: '72%',
        height: '14%',
        top: '16%',
        left: '14%',
        variant: 'title'
      },
      {
        width: '30%',
        height: '40%',
        top: '44%',
        left: '14%',
        variant: 'body'
      },
      {
        width: '30%',
        height: '40%',
        top: '44%',
        left: '56%',
        variant: 'body'
      }
    ],
    createContent: () => [
      createTextElement('Compare two ideas side-by-side', {
        y: 130,
        fontSize: 28
      }),
      createParagraphElement('Use this column for the first key point.', {
        y: 240,
        width: 260
      }),
      createParagraphElement('Use this column for the second key point.', {
        y: 240,
        x: 420,
        width: 260
      })
    ]
  },
  {
    id: 'statement',
    name: 'Statement',
    description: 'Centered quote or bold statement.',
    background: '#ffffff',
    previewBlocks: [
      {
        width: '70%',
        height: '40%',
        top: '30%',
        left: '15%',
        variant: 'title'
      },
      {
        width: '36%',
        height: '10%',
        top: '70%',
        left: '32%',
        variant: 'subtitle'
      }
    ],
    createContent: () => [
      createTextElement('Share a bold statement or quote here.', {
        y: 200,
        width: 520,
        fontSize: 48,
        textAlign: 'center',
        x: 140
      }),
      createCaptionElement('Add attribution or supporting context.', {
        y: 360,
        textAlign: 'center',
        x: 140,
        width: 520
      })
    ]
  }
];

export const getLayoutById = (layoutId) =>
  SLIDE_LAYOUTS.find((layout) => layout.id === layoutId);

export const createSlideFromLayout = (layoutId = DEFAULT_LAYOUT_ID) => {
  const layout = getLayoutById(layoutId) || getLayoutById(DEFAULT_LAYOUT_ID) || SLIDE_LAYOUTS[0];
  return {
    content: layout.createContent ? layout.createContent() : [],
    background: layout.background ?? '#050505'
  };
};
