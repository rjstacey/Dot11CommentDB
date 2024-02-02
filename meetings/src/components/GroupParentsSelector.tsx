import * as React from "react";

import { Select } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { selectGroupParents } from "../store/groups";

export function GroupParentsSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const groups = useAppSelector(selectGroupParents);

	const handleChange = (values: typeof groups) =>
		onChange(values.length > 0 ? values[0].id : null);

	const values = groups.filter((group) => group.id === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={groups}
			valueField="id"
			labelField="name"
			{...otherProps}
		/>
	);
}

export default GroupParentsSelector;
