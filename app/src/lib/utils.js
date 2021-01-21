
export function debounce(fn, ms = 0) {
	let timeoutId, lastArgs, lastThis;
	function invoke() {
		timeoutId = undefined;
		return fn.apply(lastThis, lastArgs)
	}
	function flush() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			invoke();
		}
	}
	function debounced() {
		lastArgs = arguments;
		lastThis = this;
		clearTimeout(timeoutId);
		timeoutId = setTimeout(invoke, ms);
	}
	debounced.flush = flush;
	return debounced;
}

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

// string compare for sort operations
export function strComp(a, b) {
	const A = a.toUpperCase();
	const B = b.toUpperCase();
	if (A < B) return -1;
	if (A > B) return 1;
	return 0;
}

export function shallowDiff(originalObj, modifiedObj) {
	let changed = {};
	for (let k in modifiedObj) {
		if (/*modifiedObj.hasOwnProperty(k) && */modifiedObj[k] !== originalObj[k]) {
			changed[k] = modifiedObj[k]
		}
	}
	return changed;
}

export const displayDate = d => {
	const date = (typeof d === 'string')? new Date(d): d;
	if (date)
		return date.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'});
	return ''
}
