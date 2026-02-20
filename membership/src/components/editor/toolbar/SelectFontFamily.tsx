import { DropdownButton, DropdownItem } from "react-bootstrap";
import { useFontFamilyEdit } from "../useFontFamilyEdit";

export type FontFamilyOption = { value: string | null; label: string };

const options: FontFamilyOption[] = [
	{ value: null, label: "Default" },
	{ value: "Arial", label: "Arial" },
	{ value: "Courier New", label: "Courier New" },
	{ value: "Georgia", label: "Georgia" },
	{ value: "Times New Roman", label: "Times New Roman" },
	{ value: "Trebuchet MS", label: "Trebuchet MS" },
	{ value: "Verdana", label: "Verdana" },
];

export function SelectFontFamily({ disabled }: { disabled?: boolean }) {
	const { value, onChange } = useFontFamilyEdit();
	return (
		<DropdownButton
			title={"Font"}
			align="end"
			drop="up"
			disabled={disabled}
		>
			{options.map((o, i) => (
				<DropdownItem
					key={i}
					className={value === o.value ? "active" : undefined}
					onClick={() => onChange(o.value)}
				>
					{
						<span style={{ fontFamily: o.value || undefined }}>
							{o.label}
						</span>
					}
				</DropdownItem>
			))}
		</DropdownButton>
	);
}
