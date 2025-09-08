import * as React from "react";
import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectGroups, Group, selectGroupEntities } from "@/store/groups";

function renderGroupName(
	group: Group,
	entities: ReturnType<typeof selectGroupEntities>
) {
	let label: string;
	if (group.type === "wg") {
		label = group.name;
	} else {
		const groups = [group];
		let g: Group | undefined = group;
		do {
			g = g.parent_id ? entities[g.parent_id] : undefined;
			if (g && g.type !== "wg") groups.unshift(g);
		} while (g && g.type !== "wg");
		label = groups.map((g) => g.name).join(" / ");
	}

	return label;
}

function SelectGroup({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Pick<React.ComponentProps<typeof Select>, "placeholder" | "readOnly">) {
	const entities = useAppSelector(selectGroupEntities);
	const options = useAppSelector(selectGroups);
	const values = options.filter((o) => value === o.id);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : null);

	const renderGroup = ({ item: group }: { item: Group }) =>
		renderGroupName(group, entities);

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
