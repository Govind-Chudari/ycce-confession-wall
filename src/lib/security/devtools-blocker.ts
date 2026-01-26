export function disableDevTools() {
  if (typeof window === 'undefined') return;

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable F12, DevTools shortcuts
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'J') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C') ||
      (e.ctrlKey && e.key === 'u')
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Detect DevTools opening
  const devtoolsOpen = () => {
    const threshold = 160;
    if (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    ) {
      document.body.innerHTML = '';
      alert('Developer Tools are not allowed!');
    }
  };

  setInterval(devtoolsOpen, 500);
}