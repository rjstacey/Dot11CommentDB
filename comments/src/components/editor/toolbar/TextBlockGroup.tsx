import { Button, DropdownButton } from "react-bootstrap";
import { useTextBlockSelect, TextBlockType } from "../useTextBlockEdit";
import { SelectAlignment } from "./SelectAlignment";

export type BlockTypeOption = {
	value: TextBlockType;
	label: string;
	icon: string;
};

const options: BlockTypeOption[] = [
	{ value: "paragraph", label: "Normal", icon: "bi-text-paragraph" },
	{ value: "h1", label: "Heading 1", icon: "bi-type-h1" },
	{ value: "h2", label: "Heading 2", icon: "bi-type-h2" },
	{ value: "ul", label: "Bullet List", icon: "bi-list-ul" },
	{ value: "ol", label: "Numbered List", icon: "bi-list-ol" },
	{ value: "quote", label: "Quote", icon: "bi-blockquote-left" },
	{ value: "code", label: "Code", icon: "bi-code" },
];

export function TextBlockGroup({
	disabled,
	size,
}: {
	disabled?: boolean;
	size: "sm" | "md" | "lg";
}) {
	const { value: blockType, onChange } = useTextBlockSelect();

	const buttons = options.map((o) => (
		<Button
			key={o.value}
			className={
				o.icon +
				(blockType !== "paragraph" && blockType === o.value
					? " active"
					: "")
			}
			disabled={disabled}
			onClick={() => onChange(o.value)}
			aria-label={o.label}
			title={o.label}
		/>
	));

	let moreButtons: JSX.Element[] = [];
	if (size === "md") {
		moreButtons = buttons.splice(-3, 3);
	} else if (size === "sm") {
		moreButtons = buttons.splice(-6, 6);
	}

	return (
		<div className="button-group">
			{buttons}
			{moreButtons.length > 0 && (
				<DropdownButton
					title={<i className="bi-three-dots-vertical" />}
					align="end"
					disabled={disabled}
				>
					<div className="button-group">{moreButtons}</div>
				</DropdownButton>
			)}
			<SelectAlignment key="alignment" disabled={disabled} />
		</div>
	);
}
