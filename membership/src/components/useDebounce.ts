import * as React from "react";
import debounce from "lodash.debounce";

/**
 * Create a persistent (across renders) debounced callback function that calls the latest callback function when it ultimately fires.
 */
export function useDebounce(callback: () => void) {
	// Create a mutable reference to the callback function. That way we can create a debounce function that is persistent
	// across renders but calls the latest callback function when it ultimately fires.
	const callbackRef = React.useRef<typeof callback>(() => {});

	// On each render, update the callback function reference. The callback function itself will probably have updates.
	callbackRef.current = callback;

	// Memoize debounced callback so that it persists across renders
	const debouncedCallback = React.useMemo(
		() => debounce(() => callbackRef.current(), 500),
		[]
	);

	// On unmount, call debounce flush
	React.useEffect(() => debouncedCallback.flush, [debouncedCallback]);

	return debouncedCallback;
}
