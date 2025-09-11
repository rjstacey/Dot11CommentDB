import React from "react";
import { Select } from "@common";

const voteOptions = [
	{ label: "Approve", value: "Approve" },
	{ label: "Disapprove", value: "Disapprove" },
	{
		label: "Abstain - Lack of expertise",
		value: "Abstain - Lack of expertise",
	},
	{
		label: "Abstain - Lack of time",
		value: "Abstain - Lack of time",
		disabled: true,
	},
	{
		label: "Abstain - Conflict of Interest",
		value: "Abstain - Conflict of Interest",
		disabled: true,
	},
	{ label: "Abstain - Other", value: "Abstain - Other", disabled: true },
];

export function SelectVote({
	value,
	onChange,
	...props
}: {
	value: string;
	onChange: (value: string) => void;
} & Pick<React.ComponentProps<typeof Select>, "readOnly" | "disabled" | "id">) {
	let options = voteOptions;
	let values = voteOptions.filter((v) => v.value === value);
	if (value && values.length === 0) {
		const missingOption = { label: value, value, disabled: true };
		options = [...options, missingOption];
		values = [missingOption];
	}
	return (
		<Select
			style={{ width: 220 }}
			options={options}
			values={values}
			onChange={(values) => onChange(values[0].value)}
			{...props}
		/>
	);
}
