'use client';

export type GenerationDraft = {
  palette: string[];
  bgRemove: boolean;
  mood?: string;
  priorityCode?: string;
  source: 'draw' | 'upload';
};

const DRAFT_KEY = 'myreal:draft';

export function saveDraft(draft: GenerationDraft, draftId?: string) {
  const key = draftId ? `${DRAFT_KEY}:${draftId}` : DRAFT_KEY;
  localStorage.setItem(key, JSON.stringify(draft));
}

export function loadDraft(draftId?: string): GenerationDraft | null {
  const key = draftId ? `${DRAFT_KEY}:${draftId}` : DRAFT_KEY;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GenerationDraft;
  } catch {
    return null;
  }
}

export function clearDraft(draftId?: string) {
  const key = draftId ? `${DRAFT_KEY}:${draftId}` : DRAFT_KEY;
  localStorage.removeItem(key);
}

// Result Persistence for Reload Support
export type SavedResult = {
  token: string;
  imageUrl: string;
  expiresAt: string;
  provider: 'gemini' | 'openrouter' | 'fallback';
  geminiFailed?: boolean;
};

export function saveResult(draftId: string, result: SavedResult) {
  const key = `${DRAFT_KEY}:result:${draftId}`;
  localStorage.setItem(key, JSON.stringify(result));
}

export function loadResult(draftId: string): SavedResult | null {
  const key = `${DRAFT_KEY}:result:${draftId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedResult;
  } catch {
    return null;
  }
}
