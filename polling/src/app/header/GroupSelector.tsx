import React from "react";
import { useLocation, useNavigate } from "react-router";
import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import {
	selectTopLevelGroup,
	selectTopLevelGroups,
	selectSelectedGroup,
	selectSubgroups,
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
			//clearable
			placeholder=""
			dropdownWidth={150}
			{...props}
		/>
	);
}
