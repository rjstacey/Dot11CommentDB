
export function debounce(fn, ms = 0) {
	let timeoutId;
	return function(...args) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), ms);
	};
};

// copied from https://github.com/react-bootstrap/dom-helpers
let scrollbarSize;
export function getScrollbarSize(recalculate) {
  if ((!scrollbarSize && scrollbarSize !== 0) || recalculate) {
    if (typeof window !== 'undefined' && window.document && window.document.createElement) {
      let scrollDiv = document.createElement('div');

      scrollDiv.style.position = 'absolute';
      scrollDiv.style.top = '-9999px';
      scrollDiv.style.width = '50px';
      scrollDiv.style.height = '50px';
      scrollDiv.style.overflow = 'scroll';

      document.body.appendChild(scrollDiv);
      scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
    }
  }

  return scrollbarSize;
}