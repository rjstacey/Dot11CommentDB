import React from "react";
import { Select } from "dot11-components";

import { AccessLevelOptions } from "../store/members";

function AccessSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options" | "portal"
>) {
	const values = AccessLevelOptions.filter((o) => o.value === value);
	const handleChange = (value: typeof AccessLevelOptions) =>
		onChange(value.length === 0 ? 0 : value[0].value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={AccessLevelOptions}
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}

export default AccessSelector;
