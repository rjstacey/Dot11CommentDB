import React from 'react';
import styled from '@emotion/styled';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Select, SelectItemRendererProps } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectWorkingGroups, selectWorkingGroup, setWorkingGroupId, loadGroups } from '../store/groups';

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
        label += " Members";

    return <span>{label}</span>
}

export function PathWorkingGroupSelector(props: Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {

    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const {groupName} = useParams();
	const [clearable, setClearable] = React.useState(false);

	const options = useAppSelector(selectWorkingGroups);
    const workingGroup = useAppSelector(selectWorkingGroup);
    const values = options.filter(g => g.id === workingGroup?.id);

    React.useEffect(() => {
        if (groupName) {
            const group = options.find(g => g.name === groupName);
            if (group && workingGroup?.id !== group.id)
                dispatch(setWorkingGroupId(group.id));
        } 
        else if (workingGroup) {
            const group = options.find(g => g.id === workingGroup.id);
            if (group)
                navigate(`/${group.name}`);
        }
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleChange(values: typeof options) {
        const group = await dispatch(setWorkingGroupId(values.length > 0? values[0].id: null));
        if (group)
            dispatch(loadGroups(group.name));
        let pathName = location.pathname;
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
