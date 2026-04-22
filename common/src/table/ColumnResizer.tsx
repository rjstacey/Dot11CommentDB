import { useRef, useState } from "react";
import { DraggableCore, DraggableEventHandler } from "react-draggable";
import "./ColumnResizer.css";

export type ColumnResizerProps = {
	style?: React.CSSProperties;
	className?: string;
	onDrag: DraggableEventHandler;
};

export type { DraggableEventHandler };

export function ColumnResizer({
	style,
	className,
	onDrag,
}: ColumnResizerProps) {
	const nodeRef = useRef<HTMLDivElement>(null);
	const [drag, setDrag] = useState(false);
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
				className={
					"column-resizer-handle" + (className ? " " + className : "")
				}
			/>
		</DraggableCore>
	);
}

export default ColumnResizer;
