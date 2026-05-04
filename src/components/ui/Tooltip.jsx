import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Lightweight tooltip — 500ms delay, dark bg, auto-flip, dismissible with Escape.
 * Usage: <Tooltip content="Helpful text"><button>...</button></Tooltip>
 */
export default function Tooltip({ content, children, delay = 500, className = '' }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'top' });
  const timerRef = useRef(null);
  const triggerRef = useRef(null);

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const placement = spaceAbove < 60 ? 'bottom' : 'top';
      setPos({
        top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
        left: rect.left + rect.width / 2,
        placement,
      });
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timerRef.current); };
  }, []);

  if (!content) return children;

  return (
    <>
      <span ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} className={`inline-flex ${className}`}>
        {children}
      </span>
      {visible && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: pos.placement === 'top' ? pos.top : pos.top,
            left: pos.left,
            transform: pos.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 max-w-[220px] text-center leading-snug shadow-xl border border-white/10">
            {content}
            {/* arrow */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
              pos.placement === 'top'
                ? 'top-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900'
                : 'bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900'
            }`} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}