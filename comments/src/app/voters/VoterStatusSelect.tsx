import React from "react";
import { Select } from "@common";

const options = [
	{ value: "Voter", label: "Voter" },
	{ value: "ExOfficio", label: "ExOfficio" },
];

export function VoterStatusSelect({
	value,
	onChange,
	...props
}: {
	value: string;
	onChange: (value: string) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "style" | "id" | "isInvalid"
>) {
	const values = options.filter((o) => o.value === value);

	const handleChange = (values: typeof options) =>
		onChange(values.length ? values[0].value : "");

	return (
		<Select
			style={{ width: 200 }}
			values={values}
			options={options}
			onChange={handleChange}
			{...props}
		/>
	);
}
