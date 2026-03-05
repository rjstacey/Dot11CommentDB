import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useDimensions() {
	const ref = useRef<HTMLDivElement>(null);
	const getDimensions = () => {
		return {
			width: ref.current ? ref.current.offsetWidth : 0,
			height: ref.current ? ref.current.offsetHeight : 0,
		};
	};

	const [dimensions, setDimensions] = useState(getDimensions);

	const handleResize = () => setDimensions(getDimensions());

	useEffect(() => {
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useLayoutEffect(() => {
		handleResize();
	}, []);

	return { ref, ...dimensions };
}
