import React from "react";
import { Select } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectMembersState, selectMembers } from "@/store/members";

export function MemberSelect({
	value,
	onChange,
	...props
}: {
	value: number;
	onChange: (value: number) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"className" | "readOnly" | "id" | "isInvalid"
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
			style={{ width: 400 }}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			{...props}
		/>
	);
}
