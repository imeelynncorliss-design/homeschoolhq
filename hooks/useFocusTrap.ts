import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Traps keyboard focus inside the returned ref element while `isActive` is true.
 * Auto-focuses the first focusable child on open, restores focus on close.
 *
 * Usage:
 *   const trapRef = useFocusTrap(isOpen)
 *   <div ref={trapRef} role="dialog" ...>
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(isActive: boolean) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!isActive || !ref.current) return

    const container = ref.current
    const prevFocus = document.activeElement as HTMLElement | null

    const getFocusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
        el => !el.closest('[hidden]') && el.offsetParent !== null
      )

    // Focus the first focusable element
    const focusables = getFocusables()
    if (focusables.length) focusables[0].focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusables = getFocusables()
      if (!focusables.length) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Dispatch a custom event so the modal can close itself
        container.dispatchEvent(new CustomEvent('modal-escape', { bubbles: true }))
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    container.addEventListener('keydown', handleEsc)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('keydown', handleEsc)
      prevFocus?.focus?.()
    }
  }, [isActive])

  return ref
}
