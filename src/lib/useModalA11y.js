import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Modal (açılır pencere) erişilebilirliği:
 *   - Escape ile kapanma
 *   - Sekme (Tab) tuşunun pencerenin içinde kalması (odak tuzağı)
 *   - Açılınca ilk öğeye odaklanma, kapanınca önceki öğeye dönme
 *   - Arka planın kaydırılmasını engelleme
 *
 * Kullanım:
 *   const dialogRef = useModalA11y({ onClose });
 *   <div ref={dialogRef} role="dialog" aria-modal="true"> ... </div>
 */
export function useModalA11y({ isOpen = true, onClose, closeOnEscape = true, lockScroll = true } = {}) {
  const containerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const previouslyFocused = useRef(null);

  // onClose her render'da yeni bir fonksiyon olabilir; effect'in tekrar
  // çalışıp odağı sıfırlamaması için referans üzerinden tutulur.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocused.current = document.activeElement;
    const container = containerRef.current;

    const focusTimer = setTimeout(() => {
      const first = container?.querySelector(FOCUSABLE_SELECTOR);
      first?.focus?.();
    }, 60);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab' || !container) return;

      const items = [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
        (element) => element.offsetParent !== null
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, closeOnEscape, lockScroll]);

  return containerRef;
}
