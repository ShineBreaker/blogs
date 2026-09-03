export function mountMedia(): void {
  document.querySelectorAll<HTMLImageElement>('.post-content img').forEach((image) => {
    image.tabIndex = 0;
    const enlarge = () => {
      const dialog = document.createElement('dialog');
      dialog.className = 'media-dialog';
      const enlarged = image.cloneNode(true) as HTMLImageElement;
      enlarged.removeAttribute('id');
      // cloneNode copies the thumbnail's tabindex="0" — the enlarged image
      // has no keyboard behaviour of its own, so it must not be focusable.
      enlarged.removeAttribute('tabindex');
      dialog.append(enlarged);
      dialog.addEventListener('click', () => dialog.close(), { once: true });
      dialog.addEventListener('close', () => {
        dialog.remove();
        // Return focus to the thumbnail; otherwise it falls back to <body>.
        image.focus();
      }, { once: true });
      document.body.append(dialog);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else window.open(image.currentSrc || image.src, '_blank', 'noopener');
    };
    image.addEventListener('click', enlarge);
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        enlarge();
      }
    });
  });
}
