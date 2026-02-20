import { DropdownButton, DropdownItem } from "react-bootstrap";
import { useFontSizeEdit } from "../useFontSizeEdit";

export type FontSizeOption = { value: string | null; label: string };

const options: FontSizeOption[] = [
	{ value: null, label: "Default" },
	{ value: "10px", label: "10px" },
	{ value: "11px", label: "11px" },
	{ value: "12px", label: "12px" },
	{ value: "13px", label: "13px" },
	{ value: "14px", label: "14px" },
	{ value: "16px", label: "16px" },
	{ value: "18px", label: "18px" },
	{ value: "20px", label: "20px" },
];

export function SelectFontSize({ disabled }: { disabled?: boolean }) {
	const { value, onChange } = useFontSizeEdit();
	return (
		<DropdownButton title="Size" align="end" drop="up" disabled={disabled}>
			{options.map((o, i) => (
				<DropdownItem
					key={i}
					className={value === o.value ? "active" : undefined}
					onClick={() => onChange(o.value)}
				>
					{
						<span style={{ fontSize: o.value || undefined }}>
							{o.label}
						</span>
					}
				</DropdownItem>
			))}
		</DropdownButton>
	);
}
