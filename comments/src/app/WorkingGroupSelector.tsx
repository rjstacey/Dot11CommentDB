import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Select } from "dot11-components";

import { RootState } from "../store";
import { useAppSelector } from "../store/hooks";
import { selectWorkingGroups } from "../store/groups";
import { AccessLevel } from "../store/user";

import styles from "./app.module.css";

function selectOptions(state: RootState) {
	return selectWorkingGroups(state).map((g) => {
		const access = g.permissions.comments || AccessLevel.none;
		return { ...g, disabled: access < AccessLevel.ro };
	});
}

export function WorkingGroupSelector(
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

export default WorkingGroupSelector;
