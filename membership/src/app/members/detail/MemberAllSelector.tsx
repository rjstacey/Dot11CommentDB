import * as React from "react";

import { Select } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectAllMembers } from "@/store/members";

export function MemberAllSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"id" | "style" | "placeholder" | "readOnly"
>) {
	const members = useAppSelector(selectAllMembers);
	const options = React.useMemo(
		() =>
			members.map((member) => ({
				value: member.SAPIN,
				label: `${member.SAPIN} ${member.Name || ""} (${
					member.Status
				})`,
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
			{...otherProps}
		/>
	);
}
