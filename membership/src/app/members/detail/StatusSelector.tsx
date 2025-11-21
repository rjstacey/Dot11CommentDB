import * as React from "react";
import { Select, isMultiple, MULTIPLE } from "@common";
import { statusOptions, StatusType } from "@/store/members";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";

function StatusSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | typeof MULTIPLE;
	onChange: (value: StatusType) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"id" | "style" | "readOnly" | "placeholder"
>) {
	const values = statusOptions.filter((o) => o.value === value);
	const handleChange = (values: typeof statusOptions) =>
		onChange(values.length === 0 ? "Non-Voter" : values[0].value);

	return (
		<Select
			style={{ width: 200 }}
			values={values}
			onChange={handleChange}
			options={statusOptions}
			placeholder={isMultiple(value) ? MULTIPLE_STR : BLANK_STR}
			{...otherProps}
		/>
	);
}

export default StatusSelector;
