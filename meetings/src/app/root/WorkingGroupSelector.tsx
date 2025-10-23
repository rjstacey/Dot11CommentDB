import * as React from "react";
import { useNavigate, useParams } from "react-router";
import { createSelector } from "@reduxjs/toolkit";

import { Select, AccessLevel } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroups } from "@/store/groups";

const selectOptions = createSelector(selectTopLevelGroups, (groups) =>
	groups.map((g) => {
		const access = g.permissions.meetings || AccessLevel.none;
		return { ...g, disabled: access < AccessLevel.ro };
	})
);

export function WorkingGroupSelector() {
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
			className="working-group-select"
			dropdownClassName="working-group-select-dropdown"
			values={values}
			onChange={handleChange}
			options={options}
			valueField="id"
			labelField="name"
			searchable={false}
			clearable
		/>
	);
}

export default WorkingGroupSelector;
