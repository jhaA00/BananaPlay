import { useEffect } from 'react';

export default function Modal({ children, onClose, labelledBy, dismissible = true }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && dismissible) onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, dismissible]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}
