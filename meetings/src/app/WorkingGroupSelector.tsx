import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Select, SelectItemRendererProps } from "dot11-components";

import { RootState } from "../store";
import { useAppSelector } from "../store/hooks";
import { selectWorkingGroups } from "../store/groups";
import { AccessLevel } from "../store/user";

import styles from "./app.module.css";

function renderWorkingGroup({ item, props }: SelectItemRendererProps) {
	let label = item.name;
	if (!props.clearable) label += " Meetings";

	return <span>{label}</span>;
}

function selectOptions(state: RootState) {
	return selectWorkingGroups(state).map((g) => {
		const access = g.permissions.meetings || AccessLevel.none;
		return { ...g, disabled: access < AccessLevel.ro };
	});
}

export function PathWorkingGroupSelector(
	props: Omit<
		React.ComponentProps<typeof Select>,
		"values" | "onChange" | "options"
	>
) {
	const navigate = useNavigate();
	const location = useLocation();
	const { groupName } = useParams();
	const [clearable, setClearable] = React.useState(false);

	const options = useAppSelector(selectOptions);
	const values = options.filter((g) => g.name === groupName);
	const pathName = "/" + (values.length > 0 ? values[0].name : "");
	//const values = groupName? [{id: 0, name: groupName}]: [];

	function handleChange(values: typeof options) {
		const pathName = "/" + (values.length > 0 ? values[0].name : "");
		navigate(pathName);
	}

	const onClick = () => {
		if (location.pathname !== pathName) navigate(pathName);
	};

	return (
		//<Container>
			<Select
				className={styles["working-group-select"]}
				dropdownClassName={styles["working-group-select-dropdown"]}
				onClick={onClick}
				onFocus={() => setClearable(true)}
				onBlur={() => setClearable(false)}
				values={values}
				onChange={handleChange}
				options={options}
				valueField="id"
				labelField="name"
				handle={false}
				searchable={false}
				clearable={clearable}
				placeholder={values.length > 0 ? "" : "Select working group..."}
				closeOnBlur={false}
				selectItemRenderer={renderWorkingGroup}
				{...props}
			/>
		//</Container>
	);
}

export default PathWorkingGroupSelector;
