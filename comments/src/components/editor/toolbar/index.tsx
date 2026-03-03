import { useState, useEffect, useRef } from "react";
import { UndoRedo } from "./UndoRedo";
import { TextBlockGroup } from "./TextBlockGroup";
import { TextFormatGroup } from "./TextFormatGroup";

import styles from "../editor.module.css";

type Size = "sm" | "md" | "lg";
const breakpointSmall = 525;
const breakpointMedium = 625;

export function Toolbar() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState<Size>("lg");

	useEffect(() => {
		const el = containerRef.current?.parentElement;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			const entry = entries[0];
			const contentBoxSize = entry.contentBoxSize[0];
			const { inlineSize } = contentBoxSize;
			let size: Size = "lg";
			if (inlineSize <= breakpointSmall) size = "sm";
			else if (inlineSize <= breakpointMedium) size = "md";
			setSize(size);
		});
		ro.observe(el);
		return () => ro.unobserve(el);
	}, []);

	return (
		<div
			ref={containerRef}
			className={styles.toolbar}
			onMouseDown={(e) => {
				e.preventDefault();
			}}
		>
			<UndoRedo />
			<TextFormatGroup size={size} />
			<TextBlockGroup size={size} />
		</div>
	);
}
