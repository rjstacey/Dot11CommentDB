import React from 'react';
import styled from '@emotion/styled';
import { useLocation, useNavigate } from 'react-router-dom';

import { Select, SelectItemRendererProps } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectWorkingGroups, selectWorkingGroup, setWorkingGroupId, getGroups } from '../store/groups';

const Container = styled.div`
	display: flex;
	felx-driection: row;
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

function renderWorkingGroup({item, props}: SelectItemRendererProps) {
	let label = item.name;
	if (!props.clearable)
		label += " CR";

	return <span>{label}</span>
}

export function PathWorkingGroupSelector(props: Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {

	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const [clearable, setClearable] = React.useState(false);

	const workingGroup = useAppSelector(selectWorkingGroup);
	const options = useAppSelector(selectWorkingGroups);
	const values = options.filter(g => g.id === workingGroup?.id);

	React.useEffect(() => {
		let ignore = false;
		async function onMount() {
			const groups = await dispatch(getGroups());
			if (ignore)
				return;
			const groupName = location.pathname.split('/')[1];
			if (groupName) {
				const group = groups.find(g => g.name === groupName);
				if (group && workingGroup?.id !== group.id)
					dispatch(setWorkingGroupId(group.id));
			}
			else if (workingGroup) {
				navigate(`/${workingGroup.name}`);
			}
		}
		function onUnmount() {
			ignore = true;
		}

		onMount();
		return onUnmount;
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	async function handleChange(values: typeof options) {
		const group = await dispatch(setWorkingGroupId(values.length > 0? values[0].id: null));
		let pathName = location.pathname;
		const groupName = pathName.split('/')[1];
		if (groupName && group)
			pathName = pathName.replace(`/${groupName}`, `/${group.name}`);
		else
			pathName = group? `/${group.name}`: '/';
		navigate(pathName);
	}

	
	return (
		<Container
			onClick={() => navigate('/' + (workingGroup?.name || ''))}
			onFocus={() => setClearable(true)}
			onBlur={() => setClearable(false)}
		>
			<Select
				values={values}
				onChange={handleChange}
				options={options}
				valueField='id'
				labelField='name'
				handle={false}
				searchable={false}
				clearable={clearable}
				placeholder={workingGroup? "": "Select working group..."}
				closeOnBlur
				selectItemRenderer={renderWorkingGroup}
				{...props}
			/>
		</Container>
	)
}

export default PathWorkingGroupSelector;