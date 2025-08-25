import React from "react";
import { DraggableCore, DraggableEventHandler } from "react-draggable";
import styles from "./ColumnResizer.module.css";

export type ColumnResizerProps = {
	style?: React.CSSProperties;
	className?: string;
	onDrag: DraggableEventHandler;
};

export type { DraggableEventHandler };

export function ColumnResizer({ style, className, onDrag }: ColumnResizerProps) {
	const nodeRef = React.useRef<HTMLDivElement>(null);
	const [drag, setDrag] = React.useState(false);
	if (drag) style = { ...style, backgroundColor: "rgba(0, 0, 0, 0.1)" };

	return (
		<DraggableCore
			onDrag={onDrag}
			onStart={(e) => setDrag(true)}
			onStop={(e) => setDrag(false)}
			handle="#draggable-handle"
			nodeRef={nodeRef}
		>
			<div
				id="draggable-handle"
				ref={nodeRef}
				style={style}
				className={styles["column-resizer-handle"] + (className? " " + className: "")}
			/>
		</DraggableCore>
	);
}

export default ColumnResizer;
