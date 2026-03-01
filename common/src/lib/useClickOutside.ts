import { useRef, useEffect, type RefObject } from "react";

export default function useClickOutside(
	ref: RefObject<HTMLElement>,
	callback: (event: MouseEvent) => void,
) {
	const callbackRef = useRef(callback);
	callbackRef.current = callback; // update on each render
	useEffect(() => {
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
	}, [ref]);
}
