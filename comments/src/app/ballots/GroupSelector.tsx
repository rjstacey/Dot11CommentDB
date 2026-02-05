import React from "react";
import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectGroups, Group, selectGroupEntities } from "@/store/groups";

type GroupOption = {
	id: string;
	label: string;
	active: boolean;
};

function renderGroupName(
	group: Group,
	entities: ReturnType<typeof selectGroupEntities>,
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

function useGroupOptions() {
	const entities = useAppSelector(selectGroupEntities);
	const groups = useAppSelector(selectGroups);
	return React.useMemo(() => {
		return groups
			.sort((g1, g2) => {
				if (g1.status === g2.status) return 0;
				if (g1.status && !g2.status) return -1;
				return 1;
			})
			.map(
				(group) =>
					({
						id: group.id,
						label: renderGroupName(group, entities),
						active: Boolean(group.status),
					}) satisfies GroupOption,
			);
	}, [groups, entities]);
}

const renderOption = ({ item }: { item: GroupOption }) =>
	item.active ? (
		<span>{item.label}</span>
	) : (
		<i>{`${item.label} (inactive)`}</i>
	);

function SelectGroup({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	| "placeholder"
	| "readOnly"
	| "disabled"
	| "style"
	| "id"
	| "isInvalid"
	| "className"
>) {
	const options = useGroupOptions();
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
			itemRenderer={renderOption}
			{...otherProps}
		/>
	);
}

export default SelectGroup;
