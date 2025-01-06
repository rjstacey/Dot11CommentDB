import * as React from "react";

import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { Group, selectGroups } from "@/store/groups";

export function GroupSelector({
	value,
	onChange,
	types,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
	types?: string[];
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	let groups = useAppSelector(selectGroups);
	if (types) groups = groups.filter((group) => types.includes(group.type!));

	const handleChange = React.useCallback(
		(values: Group[]) => {
			onChange(values.length > 0 ? values[0].id : "");
		},
		[onChange]
	);

	let values: Group[];
	values = groups.filter((group) => group.id === (value as string));

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={groups}
			clearable
			valueField="id"
			labelField="name"
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}

export default GroupSelector;
