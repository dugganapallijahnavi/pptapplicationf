const STORAGE_VERSION = '1';

const STORAGE_KEYS = {
  activePresentationId: 'pptts:activePresentationId',
  presentationsList: 'pptts:presentations:list'
};

const presentationDataKey = (id) => `pptts:presentation:data:${id}`;

const safeParse = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && parsed.version === STORAGE_VERSION) {
      return parsed.value;
    }
  } catch (error) {
    console.warn('Failed to parse stored presentation data', error);
  }
  return fallback;
};

const buildPayload = (value) => JSON.stringify({ version: STORAGE_VERSION, value });

export const generatePresentationId = () =>
  `pres-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const getActivePresentationId = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEYS.activePresentationId);
  } catch (error) {
    console.warn('Unable to read active presentation id', error);
    return null;
  }
};

export const setActivePresentationId = (id) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (id) {
      window.localStorage.setItem(STORAGE_KEYS.activePresentationId, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.activePresentationId);
    }
  } catch (error) {
    console.warn('Unable to persist active presentation id', error);
  }
};

export const loadPresentationData = (id) => {
  if (!id || typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(presentationDataKey(id));
    return safeParse(raw, null);
  } catch (error) {
    console.warn('Failed to load presentation data', error);
    return null;
  }
};

export const savePresentationData = (id, data) => {
  if (!id || typeof window === 'undefined') {
    return null;
  }
  const payload = {
    ...data,
    updatedAt: data?.updatedAt || Date.now()
  };
  try {
    window.localStorage.setItem(presentationDataKey(id), buildPayload(payload));
  } catch (error) {
    console.warn('Failed to save presentation data', error);
  }
  return payload.updatedAt;
};

export const deletePresentationData = (id) => {
  if (!id || typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(presentationDataKey(id));
  } catch (error) {
    console.warn('Failed to delete presentation data', error);
  }
};

const loadPresentationsList = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.presentationsList);
    return safeParse(raw, []);
  } catch (error) {
    console.warn('Failed to load presentations list', error);
    return [];
  }
};

const persistPresentationsList = (list) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.presentationsList,
      buildPayload(list)
    );
  } catch (error) {
    console.warn('Failed to persist presentations list', error);
  }
};

export const getRecentPresentations = () => {
  const list = loadPresentationsList();
  return list
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

export const upsertRecentPresentation = (metadata) => {
  if (!metadata?.id) {
    return;
  }
  const list = loadPresentationsList();
  const filtered = list.filter((item) => item.id !== metadata.id);
  const merged = {
    id: metadata.id,
    name: metadata.name || 'Untitled presentation',
    updatedAt: metadata.updatedAt || Date.now(),
    preview: metadata.preview || null
  };
  filtered.unshift(merged);
  persistPresentationsList(filtered.slice(0, 20));
};

export const deletePresentation = (id) => {
  if (!id) {
    return;
  }
  const list = loadPresentationsList();
  const filtered = list.filter((item) => item.id !== id);
  persistPresentationsList(filtered);
  deletePresentationData(id);
  if (getActivePresentationId() === id) {
    setActivePresentationId(null);
  }
};

export const clearAllPresentations = () => {
  const list = loadPresentationsList();
  list.forEach((item) => deletePresentationData(item.id));
  persistPresentationsList([]);
  setActivePresentationId(null);
};
