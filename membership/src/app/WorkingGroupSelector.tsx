import * as React from "react";
import { useNavigate, useParams } from "react-router";
import { createSelector } from "@reduxjs/toolkit";

import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectWorkingGroups } from "@/store/groups";
import { AccessLevel } from "@/store/user";

import styles from "./app.module.css";

const selectOptions = createSelector(selectWorkingGroups, (groups) =>
	groups.map((g) => {
		const access = g.permissions.members || AccessLevel.none;
		return { ...g, disabled: access < AccessLevel.ro };
	})
);

export function PathWorkingGroupSelector(
	props: Omit<
		React.ComponentProps<typeof Select>,
		"values" | "onChange" | "options"
	>
) {
	const navigate = useNavigate();
	const { groupName } = useParams();

	const options = useAppSelector(selectOptions);
	const values = options.filter((g) => g.name === groupName);

	function handleChange(values: typeof options) {
		const pathName = "/" + (values.length > 0 ? values[0].name : "");
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

export default PathWorkingGroupSelector;
