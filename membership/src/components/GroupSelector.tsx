import * as React from "react";

import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectGroupEntities, selectGroups } from "@/store/groups";

type MinimalGroup = {
	id: string;
	name: string;
};

export function GroupSelector({
	value,
	onChange,
	types,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	types?: string[];
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const groupEntities = useAppSelector(selectGroupEntities);
	const groups = useAppSelector(selectGroups);
	let options: MinimalGroup[] = types
		? groups.filter((group) => group.type && types.includes(group.type))
		: groups;
	if (value && !options.find((g) => g.id === value)) {
		const entity = groupEntities[value] || { id: value, name: "Unknown" };
		options = [...options, entity];
	}

	const handleChange = (values: typeof groups) =>
		onChange(values.length > 0 ? values[0].id : null);
	const values = options.filter((group) => group.id === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			valueField="id"
			labelField="name"
			{...otherProps}
		/>
	);
}

export default GroupSelector;
