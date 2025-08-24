import React from "react";

import { Select } from "@components/select";

import { useAppSelector } from "@/store/hooks";
import { IeeeMember, selectIeeeMembers } from "@/store/ieeeMembers";
import { selectMemberIds } from "@/store/members";

function itemRenderer({ item: member }: { item: IeeeMember }) {
	let name = `${member.LastName}, ${member.FirstName}`;
	if (member.MI) name += ` ${member.MI}`;
	return (
		<div>
			<div style={{ width: 30 }}>{member.SAPIN}</div>
			<div>{name}</div>
		</div>
	);
}

export function IeeeMemberSelector({
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
	const memberSapins = useAppSelector(selectMemberIds);
	const options = useAppSelector(selectIeeeMembers).filter(
		(o) => !memberSapins.includes(o.SAPIN)
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
			clearable
			valueField="SAPIN"
			labelField="Name"
			itemRenderer={itemRenderer}
			selectItemRenderer={itemRenderer}
			readOnly={readOnly}
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}
