import { DropdownButton, Button } from "react-bootstrap";
import { useTextFormatEdit, TextFormatType } from "../useTextFormatEdit";

const options: {
	value: TextFormatType;
	label: string;
	icon: string;
}[] = [
	{ value: "bold", label: "Bold (Ctrl-b)", icon: "bi-type-bold" },
	{ value: "italic", label: "Italics (Ctrl-i)", icon: "bi-type-italic" },
	{
		value: "underline",
		label: "Underline (Ctrl-u)",
		icon: "bi-type-underline",
	},
	{
		value: "strikethrough",
		label: "Strikethrough (Ctrl-/)",
		icon: "bi-type-strikethrough",
	},
	{ value: "highlight", label: "Highlight", icon: "bi-highlighter" },
	{ value: "code", label: "Insert code", icon: "bi-code" },
];

export function TextFormatGroup({
	disabled,
	size,
}: {
	disabled?: boolean;
	size: "sm" | "md" | "lg";
}) {
	const { formats, toggleFormat, insertLink, isLink } = useTextFormatEdit();

	const buttons = options
		.map((o) => (
			<Button
				key={o.value}
				disabled={disabled}
				onClick={() => toggleFormat(o.value)}
				title={o.label}
				active={formats.includes(o.value)}
				className={o.icon}
			/>
		))
		.concat(
			<Button
				key="link"
				disabled={disabled}
				onClick={insertLink}
				title={(isLink ? "Remove" : "Insert") + " link"}
				active={isLink}
				className="bi-link"
			/>,
		);

	let moreButtons: React.ReactElement[] = [];
	if (size === "md" || size == "sm") {
		moreButtons = buttons.splice(-3, 3);
	}

	return (
		<div className="button-group">
			{buttons}
			{moreButtons.length > 0 && (
				<DropdownButton
					title={<i className="bi-three-dots-vertical" />}
					align={size === "sm" ? "start" : "end"}
					disabled={disabled}
				>
					<div className="button-group">{moreButtons}</div>
				</DropdownButton>
			)}
		</div>
	);
}
