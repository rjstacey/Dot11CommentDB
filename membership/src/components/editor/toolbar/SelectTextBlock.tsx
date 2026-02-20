import { DropdownButton, DropdownItem, DropdownDivider } from "react-bootstrap";
import cx from "clsx";
import { useTextBlockSelect, TextBlockType } from "../useTextBlockEdit";

const iconLabel = (icon: string, text: string) => (
	<>
		<i className={cx("me-1", icon)} />
		<span>{text}</span>
	</>
);

export type BlockTypeOption = {
	value: TextBlockType;
	label: string;
	icon: string;
};

const options: BlockTypeOption[] = [
	{ value: "paragraph", label: "Normal", icon: "bi-text-paragraph" },
	{ value: "h1", label: "Heading 1", icon: "bi-type-h1" },
	{ value: "h2", label: "Heading 2", icon: "bi-type-h2" },
	{ value: "h3", label: "Heading 3", icon: "bi-type-h3" },
	{ value: "ul", label: "Bullet List", icon: "bi-list-ul" },
	{ value: "ol", label: "Numbered List", icon: "bi-list-ol" },
	{ value: "quote", label: "Quote", icon: "bi-blockquote-left" },
	{ value: "code", label: "Code", icon: "bi-code" },
];

export function SelectTextBlockType({ disabled }: { disabled?: boolean }) {
	const { value, onChange } = useTextBlockSelect();
	const option = options.find((o) => o.value === value) || options[0];
	return (
		<DropdownButton
			title={iconLabel(option.icon, option.label)}
			align="end"
			drop="up"
			disabled={disabled}
		>
			{options.map((o, i) =>
				o.value ? (
					<DropdownItem
						key={i}
						className={value === o.value ? "active" : undefined}
						onClick={() => onChange(o.value)}
					>
						{iconLabel(o.icon, o.label)}
					</DropdownItem>
				) : (
					<DropdownDivider key={i} />
				),
			)}
		</DropdownButton>
	);
}
