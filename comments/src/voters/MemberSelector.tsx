import React from "react";
import { Select } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { selectMembersState, selectMembers } from "../store/members";

function MemberSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const { loading } = useAppSelector(selectMembersState);
	const members = useAppSelector(selectMembers);
	const options = React.useMemo(
		() =>
			members.map((m) => ({
				value: m.SAPIN,
				label: `${m.SAPIN} ${m.Name} (${m.Status})`,
			})),
		[members]
	);

	const values = options.filter((o) => o.value === value);

	const handleChange = (values: typeof options) =>
		onChange(values.length ? values[0].value : 0);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			readOnly={readOnly}
			{...otherProps}
		/>
	);
}

export default MemberSelector;
