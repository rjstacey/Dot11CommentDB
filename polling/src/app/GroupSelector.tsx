import React from "react";
import { useLocation, useNavigate } from "react-router";

import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import {
	selectTopLevelGroup,
	selectSelectedGroup,
	selectSubgroups,
	selectTopLevelGroups,
	Group,
} from "@/store/groups";

import styles from "./app.module.css";

export function GroupSelector(
	props: Omit<
		React.ComponentProps<typeof Select>,
		"values" | "onChange" | "options"
	>
) {
	const location = useLocation();
	const navigate = useNavigate();
	const group = useAppSelector(selectTopLevelGroup);
	const subgroup = useAppSelector(selectSelectedGroup);

	const groupOptions = useAppSelector(selectTopLevelGroups);
	const subgroupOptions = useAppSelector(selectSubgroups);

	const isGroupSelection = !group;

	let options: Group[];
	let values: Group[];
	if (isGroupSelection) {
		options = groupOptions;
		values = options.filter((g) => g === group);
	} else {
		options = subgroupOptions;
		values = options.filter((g) => g === subgroup);
	}

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

	return (
		<Select
			className={styles["working-group-select"]}
			dropdownClassName={styles["working-group-select-dropdown"]}
			values={values}
			onChange={handleChange}
			options={options}
			valueField="id"
			labelField="name"
			searchable={false}
			clearable
			{...props}
		/>
	);
}

export default GroupSelector;
