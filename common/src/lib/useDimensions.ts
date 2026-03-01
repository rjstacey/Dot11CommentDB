import { useRef, useEffect, useState } from "react";

export function useDimensions() {
	const ref = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(1600);
	const [height, setHeight] = useState(900);

	useEffect(() => {
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				let { width, height } = entry.contentRect;
				if ((16 / 9) * height > width) height = (9 * width) / 16;
				else width = (16 * height) / 9;
				setWidth(width);
				setHeight(height);
			}
		});
		if (ref.current) observer.observe(ref.current);
		return () => {
			if (ref.current) observer.unobserve(ref.current);
		};
	}, []);

	return { ref, width, height };
}
