import * as React from "react";

import { Select } from "@common";

import { useAppSelector } from "@/store/hooks";
import { Group, selectGroups } from "@/store/groups";

export function GroupSelector({
	value,
	onChange,
	types,
	...props
}: {
	value: string;
	onChange: (value: string) => void;
	types?: string[];
} & Pick<
	React.ComponentProps<typeof Select>,
	| "readOnly"
	| "disabled"
	| "id"
	| "placeholder"
	| "className"
	| "style"
	| "isInvalid"
>) {
	let groups = useAppSelector(selectGroups);
	if (types) groups = groups.filter((group) => types.includes(group.type!));

	const handleChange = React.useCallback(
		(values: Group[]) => {
			onChange(values.length > 0 ? values[0].id : "");
		},
		[onChange]
	);

	const values = groups.filter((group) => group.id === (value as string));

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={groups}
			clearable
			valueField="id"
			labelField="name"
			portal={document.querySelector("#root")}
			{...props}
		/>
	);
}

export default GroupSelector;
