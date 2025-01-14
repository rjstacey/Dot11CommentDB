import * as React from "react";
import { Select } from "dot11-components";
import { officerPositionsForGroupType } from "@/store/officers";
import { GroupType } from "@/store/groups";

function OfficerPositionSelector({
	value,
	onChange,
	groupType,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
	groupType: GroupType;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const options = officerPositionsForGroupType(groupType).map((v) => ({
		value: v,
		label: v,
	}));
	if (value && !options.find((o) => o.value === value))
		options.push({ value, label: value });
	const values = options.filter((o) => o.value === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].value : "");

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}

export default OfficerPositionSelector;
