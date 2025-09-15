import { Dropdown } from "react-bootstrap";

const displayFormat: Record<number, string> = {
	0: "Table view",
	1: "Slot view: 1-day",
	3: "Slot view: 3-day",
	5: "Slot view: 5-day",
	6: "Slot view: 6-day",
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
