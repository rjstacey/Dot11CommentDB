import * as React from "react";

import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectActiveMembers, selectAllMembers } from "@/store/members";
import { selectWorkingGroup } from "@/store/groups";

function MemberSelector({
	value, // value is SAPIN
	onChange,
	readOnly,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
	readOnly?: boolean;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const workingGroup = useAppSelector(selectWorkingGroup);
	const options = useAppSelector(
		workingGroup && workingGroup.type === "r"
			? selectAllMembers
			: selectActiveMembers
	);
	const values = options.filter((o) => o.SAPIN === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].SAPIN : 0);

	return (
		<Select
			style={{ width: 300 }}
			values={values}
			onChange={handleChange}
			options={options}
			create
			clearable
			valueField="SAPIN"
			labelField="Name"
			readOnly={readOnly}
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}

export default MemberSelector;
