import * as React from "react";
import debounce from "lodash.debounce";

/**
 * Create a persistent (across renders) debounced callback function that calls the latest callback function when it ultimately fires.
 */
export function useDebounce(callback: () => void, timeout = 500) {
	const callbackRef = React.useRef<typeof callback>(() => {});
	callbackRef.current = callback;		// update on each render

	// debounced callback persists across renders
	const debouncedCallback = React.useMemo(
		() => debounce(() => callbackRef.current(), timeout),
		[timeout]
	);

	// On unmount, call debounce flush
	React.useEffect(() => debouncedCallback.flush, [debouncedCallback]);

	return debouncedCallback;
}
