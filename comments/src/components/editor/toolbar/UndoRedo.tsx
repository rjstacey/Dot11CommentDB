import { Button } from "react-bootstrap";
import { useUndoRedo } from "../useUndoRedo";

export function UndoRedo({ disabled }: { disabled?: boolean }) {
	const { canUndo, canRedo, undo, redo } = useUndoRedo();

	return (
		<div className="button-group">
			<Button
				disabled={!canUndo || disabled}
				onClick={undo}
				aria-label="Undo"
				title="Undo (Ctrl-z)"
				className="bi-arrow-counterclockwise"
			/>
			<Button
				disabled={!canRedo || disabled}
				onClick={redo}
				aria-label="Redo"
				title="Redo (Ctrl-r)"
				className="bi-arrow-clockwise"
			/>
		</div>
	);
}
