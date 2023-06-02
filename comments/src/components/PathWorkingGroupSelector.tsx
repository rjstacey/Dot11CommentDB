import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Select } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectWorkingGroups, selectWorkingGroupId, setWorkingGroupId, loadGroups } from '../store/groups';

export function PathWorkingGroupSelector(props: Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {

    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const {groupName} = useParams();

	const options = useAppSelector(selectWorkingGroups);
    const workingGroupId = useAppSelector(selectWorkingGroupId);
    const values = options.filter(g => g.id === workingGroupId);

    React.useEffect(() => {
        if (groupName) {
            const group = options.find(g => g.name === groupName);
            if (group && workingGroupId !== group.id)
                dispatch(setWorkingGroupId(group.id));
        } 
        else if (workingGroupId) {
            const group = options.find(g => g.id === workingGroupId);
            if (group)
                navigate(`/${group.name}`);
        }
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleChange(values: typeof options) {
        const group = await dispatch(setWorkingGroupId(values.length > 0? values[0].id: null));
        if (group)
            dispatch(loadGroups({parent_id: group.id}));
        let pathName = location.pathname;
        if (groupName && group)
            pathName = pathName.replace(`/${groupName}`, `/${group.name}`);
        else
            pathName = group? `/${group.name}`: '/';
		navigate(pathName);
    }

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			valueField='id'
			labelField='name'
            handle={false}
            searchable={false}
			{...props}
		/>
	)
}

export default PathWorkingGroupSelector;
