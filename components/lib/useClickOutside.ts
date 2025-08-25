import * as React from "react";

export default function useClickOutside(
	ref: React.RefObject<HTMLElement>,
	callback: (event: MouseEvent) => void
) {
	const callbackRef = React.useRef(callback);
	callbackRef.current = callback;		// update on each render
	React.useEffect(
		() => {
			const listener = (event: MouseEvent) => {
				// Do nothing if clicking ref's element or descendent elements
				if (
					!ref.current ||
					ref.current.contains(event.target as HTMLElement)
				) {
					return;
				}

				callbackRef.current(event);
			};

			document.addEventListener("click", listener);

			return () => {
				document.removeEventListener("click", listener);
			};
		},
		[ref]
	);
}
