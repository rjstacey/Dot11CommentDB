import { BLANK_STR } from "./constants";

export const ProvidedExisting = ({
	newStr,
	oldStr,
	className,
}: {
	newStr: string;
	oldStr: string | null;
	className?: string;
}) => {
	const newStyle: React.CSSProperties = {};

	if (!newStr) {
		newStr = BLANK_STR;
		newStyle.fontStyle = "italic";
	}

	if (oldStr === "") {
		oldStr = BLANK_STR;
	} else if (oldStr) {
		oldStr = `(${oldStr})`;
	}

	let content: React.ReactNode;
	if (oldStr !== null) {
		content = (
			<>
				<span style={newStyle}>{newStr}</span>
				<br />
				<span style={{ fontStyle: "italic", fontWeight: "bold" }}>
					{oldStr}
				</span>
			</>
		);
	} else {
		content = <span style={newStyle}>{newStr}</span>;
	}
	className = (className ? className + " " : "") + "text-truncate";
	return <div className={className}>{content}</div>;
};
