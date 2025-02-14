import * as React from "react";

import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectAllMembers } from "@/store/members";

export function MemberAllSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options" | "clearable" | "readOnly"
>) {
	const members = useAppSelector(selectAllMembers);
	const options = React.useMemo(
		() =>
			members.map((member) => ({
				value: member.SAPIN,
				label: `${member.SAPIN} ${member.Name || ""} (${member.Status})`,
			})),
		[members]
	);
	const values = options.filter((o) => o.value === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].value : null);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			readOnly={readOnly}
			{...otherProps}
		/>
	);
}
