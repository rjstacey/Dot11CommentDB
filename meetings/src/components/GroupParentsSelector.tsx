import * as React from "react";

import { Select } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectGroupParents } from "@/store/groups";

export function GroupParentsSelector({
	value,
	onChange,
	...props
}: {
	value: string | null;
	onChange: (value: string | null) => void;
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
			{...props}
		/>
	);
}

export default GroupParentsSelector;
