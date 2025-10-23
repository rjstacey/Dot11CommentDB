import React from "react";
import { useLocation, useNavigate } from "react-router";
import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import {
	selectTopLevelGroup,
	selectTopLevelGroups,
	selectSelectedGroup,
	selectSubgroups,
	selectGroupEntities,
	Group,
} from "@/store/groups";

import css from "../app.module.css";

export function GroupSelector(
	props: Pick<
		React.ComponentProps<typeof Select>,
		"id" | "className" | "style" | "readOnly" | "disabled"
	>
) {
	const location = useLocation();
	const navigate = useNavigate();
	const group = useAppSelector(selectTopLevelGroup);

	const options = useAppSelector(selectTopLevelGroups);
	const values = options.filter((g) => g.id === group?.id);

	function handleChange(values: typeof options) {
		const [g] = values;
		let pathName = "";
		if (g) {
			pathName = `${g.name}/WG`;
			if (location.pathname.endsWith("/admin")) pathName += "/admin";
		}
		navigate(pathName);
	}

	const placeholder = group ? "" : "Select group...";

	return (
		<Select
			className={css["group-select"]}
			dropdownClassName={css["group-select-dropdown"]}
			values={values}
			onChange={handleChange}
			options={options}
			valueField="id"
			labelField="name"
			searchable={false}
			placeholder={placeholder}
			dropdownWidth={150}
			{...props}
		/>
	);
}

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

export function SubgroupSelector(
	props: Pick<
		React.ComponentProps<typeof Select>,
		"id" | "className" | "style" | "readOnly" | "disabled"
	>
) {
	const location = useLocation();
	const navigate = useNavigate();
	const group = useAppSelector(selectTopLevelGroup);
	const subgroup = useAppSelector(selectSelectedGroup);
	const entities = useAppSelector(selectGroupEntities);
	const options = useAppSelector(selectSubgroups);
	const values = options.filter((g) => g.id === subgroup?.id);

	function handleChange(values: typeof options) {
		const [g] = values;
		let pathName: string;
		if (group) {
			pathName = `${group.name}/${
				g && g.id !== group.id ? g.name : "WG"
			}`;
		} else if (g) {
			pathName = `${g.name}/WG`;
		} else {
			pathName = "";
		}
		if (location.pathname.endsWith("/admin")) pathName += "/admin";
		navigate(pathName);
	}

	const renderGroup = ({ item: group }: { item: Group }) =>
		renderGroupName(group, entities);

	return (
		<Select
			className={css["group-select"]}
			dropdownClassName={css["group-select-dropdown"]}
			values={values}
			onChange={handleChange}
			options={options}
			searchable={false}
			placeholder=""
			//dropdownWidth={150}
			valueField="id"
			labelField="name"
			itemRenderer={renderGroup}
			selectItemRenderer={renderGroup}
			{...props}
		/>
	);
}
