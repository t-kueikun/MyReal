'use client';

export type GenerationDraft = {
  palette: string[];
  bgRemove: boolean;
  priorityCode?: string;
  source: 'draw' | 'upload';
};

const DRAFT_KEY = 'myreal:draft';

export function saveDraft(draft: GenerationDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft(): GenerationDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GenerationDraft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}
