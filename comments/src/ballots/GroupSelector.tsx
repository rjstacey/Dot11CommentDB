import * as React from "react";
import { Select } from "dot11-components";
import { useAppSelector } from "../store/hooks";
import { selectGroups, Group, selectGroupEntities } from "../store/groups";

function GroupName({ group }: { group: Group }) {
	const entities = useAppSelector(selectGroupEntities);
	const parentGroup = group.parent_id && entities[group.parent_id];
	let label = group.name;
	if (parentGroup && parentGroup.type !== "wg")
		label = `${parentGroup.name} / ${group.name}`;
	return <span>{label}</span>;
}

const renderGroup = ({ item }: { item: Group }) => <GroupName group={item} />;

function SelectGroup({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "options" | "onChange"
>) {
	const options = useAppSelector(selectGroups);
	const values = options.filter((o) => value === o.id);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : null);

	return (
		<Select
			style={{ minWidth: 100, width: 200 }}
			values={values}
			options={options}
			onChange={handleChange}
			clearable
			searchable
			dropdownPosition="auto"
			valueField="id"
			labelField="name"
			itemRenderer={renderGroup}
			selectItemRenderer={renderGroup}
			{...otherProps}
		/>
	);
}

export default SelectGroup;
