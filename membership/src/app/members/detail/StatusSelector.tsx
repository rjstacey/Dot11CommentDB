import * as React from "react";
import { Select } from "@components/select";

import { isMultiple, MULTIPLE } from "dot11-components";

import { statusOptions, StatusType } from "@/store/members";

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

function StatusSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | typeof MULTIPLE;
	onChange: (value: StatusType) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options" | "portal"
>) {
	const values = statusOptions.filter((o) => o.value === value);
	const handleChange = (values: typeof statusOptions) =>
		onChange(values.length === 0 ? "Non-Voter" : values[0].value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={statusOptions}
			portal={document.querySelector("#root")}
			placeholder={isMultiple(value) ? MULTIPLE_STR : BLANK_STR}
			{...otherProps}
		/>
	);
}

export default StatusSelector;
