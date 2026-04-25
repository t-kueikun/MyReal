'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NEXT_SELECTOR = '[data-hotkey-next]';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    tagName === 'BUTTON'
  );
}

function isEnabledTarget(element: HTMLElement) {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    if (element.disabled) return false;
  }

  if (element.getAttribute('aria-disabled') === 'true') return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return element.getClientRects().length > 0;
}

function clickNextAction() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(NEXT_SELECTOR));
  const target = candidates.find(isEnabledTarget);
  if (!target) return false;
  target.click();
  return true;
}

export default function GlobalHotkeys() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || isTypingTarget(event.target)) {
        return;
      }

      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
      if (!hasModifier && event.code === 'Space') {
        const handled = clickNextAction();
        if (handled) event.preventDefault();
        return;
      }

      if (hasModifier || event.code !== 'KeyA') return;
      event.preventDefault();
      if (window.history.length > 1) {
        router.back();
        return;
      }
      router.push('/');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  return null;
}
