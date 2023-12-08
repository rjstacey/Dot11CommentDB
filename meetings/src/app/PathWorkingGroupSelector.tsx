import React from "react";
import styled from "@emotion/styled";
import { useNavigate, useParams } from "react-router-dom";

import { Select, SelectItemRendererProps } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { selectWorkingGroups } from "../store/groups";
import { AccessLevel } from "../store/user";

const Container = styled.div`
	display: flex;
	flex-driection: row;
	align-items: center;

	& .dropdown-select {
		font-family: "Arial", "Helvetica", sans-serif;
		font-weight: 400;
		font-size: 24px;
		color: #008080;
		border: unset;
		background-color: unset;
		padding: 0;
		margin: 5px;
	}

	& .dropdown-select:hover {
		cursor: pointer;
	}

	& .dropdown-select-dropdown {
		font-size: 16px;
	}
`;

function renderWorkingGroup({ item, props }: SelectItemRendererProps) {
	let label = item.name;
	if (!props.clearable) label += " Meetings";

	return <span>{label}</span>;
}

export function PathWorkingGroupSelector(
	props: Omit<
		React.ComponentProps<typeof Select>,
		"values" | "onChange" | "options"
	>
) {
	const navigate = useNavigate();
	const { groupName } = useParams();
	const [clearable, setClearable] = React.useState(false);

	const options = useAppSelector(selectWorkingGroups).map((g) => {
		const access = g.permissions.meetings || AccessLevel.none;
		return { ...g, disabled: access < AccessLevel.ro };
	});
	const values = options.filter((g) => g.name === groupName);

	function handleChange(values: typeof options) {
		const pathName = "/" + (values.length > 0 ? values[0].name : "");
		navigate(pathName);
	}

	return (
		<Container
			onClick={() => navigate(`/${groupName}`)}
			onFocus={() => setClearable(true)}
			onBlur={() => setClearable(false)}
		>
			<Select
				values={values}
				onChange={handleChange}
				options={options}
				valueField="id"
				labelField="name"
				handle={false}
				searchable={false}
				clearable={clearable}
				placeholder={values.length > 0 ? "" : "Select working group..."}
				closeOnBlur
				selectItemRenderer={renderWorkingGroup}
				{...props}
			/>
		</Container>
	);
}

export default PathWorkingGroupSelector;
