import * as React from "react";
import { useNavigate, useParams } from "react-router";

import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroups } from "@/store/groups";

import styles from "./app.module.css";

export function WorkingGroupSelector(
	props: Omit<
		React.ComponentProps<typeof Select>,
		"values" | "onChange" | "options"
	>
) {
	const navigate = useNavigate();
	const { groupName } = useParams();

	const options = useAppSelector(selectTopLevelGroups);
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
