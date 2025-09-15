import { Dropdown } from "react-bootstrap";

const displayFormat: Record<number, string> = {
	0: "Table view",
	1: "1-day slot view",
	3: "3-day slot view",
	5: "5-day slot view",
	6: "6-day slot view",
};

const displayFormatOptions = Object.entries(displayFormat).map(
	([key, label]) => ({ value: parseInt(key), label })
);

export function DisplayFormatSelect({
	value,
	onChange,
	disabled,
}: {
	value: number;
	onChange: (value: number) => void;
	disabled?: boolean;
}) {
	return (
		<Dropdown>
			<Dropdown.Toggle variant="light" disabled={disabled}>
				{displayFormat[value] || ""}
			</Dropdown.Toggle>
			<Dropdown.Menu>
				{displayFormatOptions.map((option) => (
					<Dropdown.Item
						key={option.value}
						active={option.value === value}
						onClick={() => onChange(option.value)}
					>
						{option.label}
					</Dropdown.Item>
				))}
			</Dropdown.Menu>
		</Dropdown>
	);
}
