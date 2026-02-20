import { Button } from "react-bootstrap";
import { useFormatText } from "../useFormatText";

export function TextFormatGroup({ disabled }: { disabled: boolean }) {
	const {
		isBold,
		isItalic,
		isUnderline,
		isStrikethrough,
		isCode,
		isLink,
		insertLink,
		setFormat,
	} = useFormatText();

	return (
		<div className="button-group">
			<Button
				onClick={() => setFormat("bold")}
				className={isBold ? "active" : undefined}
				aria-label="Format Bold"
				disabled={disabled}
			>
				<i className="bi-type-bold" />
			</Button>
			<Button
				onClick={() => setFormat("italic")}
				className={isItalic ? "active" : undefined}
				aria-label="Format Italics"
				disabled={disabled}
			>
				<i className="bi-type-italic" />
			</Button>
			<Button
				onClick={() => setFormat("underline")}
				className={isUnderline ? "active" : undefined}
				aria-label="Format Underline"
				disabled={disabled}
			>
				<i className="bi-type-underline" />
			</Button>
			<Button
				onClick={() => setFormat("strikethrough")}
				className={isStrikethrough ? "active" : undefined}
				aria-label="Format Strikethrough"
				disabled={disabled}
			>
				<i className="bi-type-strikethrough" />
			</Button>
			<Button
				onClick={() => setFormat("code")}
				className={isCode ? "active" : undefined}
				aria-label="Insert Code"
				disabled={disabled}
			>
				<i className="bi-code" />
			</Button>
			<Button
				onClick={insertLink}
				className={isLink ? "active" : undefined}
				aria-label="Insert Link"
				disabled={disabled}
			>
				<i className="bi-link" />
			</Button>
		</div>
	);
}
