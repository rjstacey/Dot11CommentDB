const BLANK_STR = "(Blank)";

export const TruncatedDiff = ({
	newStr,
	oldStr,
	className,
}: {
	newStr: string;
	oldStr: string | null;
	className?: string;
}) => {
	const newStyle: React.CSSProperties = {},
		oldStyle: React.CSSProperties = {};

	if (!newStr) {
		newStr = BLANK_STR;
		newStyle.fontStyle = "italic";
	}

	if (oldStr === "") {
		oldStr = BLANK_STR;
		oldStyle.fontStyle = "italic";
	}

	let content: React.ReactNode;
	if (oldStr !== null) {
		content = (
			<>
				<del style={oldStyle}>{oldStr}</del>
				<br />
				<ins style={newStyle}>{newStr}</ins>
			</>
		);
	} else {
		content = <span style={newStyle}>{newStr}</span>;
	}
	className = (className ? className + " " : "") + "text-truncate";
	return <div className={className}>{content}</div>;
};
