import PropTypes from 'prop-types';
import React from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigate, useLocation} from 'react-router-dom';

import {Select} from 'dot11-components/form';

import {selectGroupsState} from '../store/groups';
import {selectCurrentGroupId, setCurrentGroupId} from '../store/current';

const types = ['c', 'wg'];

export function PathGroupSelector({
	onChange,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {entities, ids} = useSelector(selectGroupsState);
	const groupId = useSelector(selectCurrentGroupId);
	const navigate = useNavigate();
	const location = useLocation();

	React.useEffect(() => {
		const components = location.pathname.split('/');
		const groupName = components[1];
		const group = Object.values(entities).find(g => g.name === groupName);
		if (group) {
			if (groupId !== group.id)
				dispatch(setCurrentGroupId(group.id));
		}
		else {
			if (groupId)
				dispatch(setCurrentGroupId(null));
		}
	}, [dispatch, location, entities, groupId]);

	const groups = React.useMemo(() => {
		let groups = ids
			.map(id => entities[id])
			.filter(group => types.includes(group.type))
		return groups;
	}, [entities, ids]);

	const handleChange = (values) => {
		const newGroupId = values.length > 0? values[0].id: null

		dispatch(setCurrentGroupId(newGroupId));

		if (onChange)
			onChange(newGroupId);

		const components = location.pathname.split('/');
		const group = entities[newGroupId];
		components[1] = group? group.name: '*';
		navigate(components.join('/'));
	};

	const values = groups.filter(g => g.id === groupId);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={groups}
			clearable
			valueField='id'
			labelField='name'
			{...otherProps}
		/>
	)
}

PathGroupSelector.propTypes = {
	onChange: PropTypes.func,
}

const LabeledPathGroupSelector = (props) =>
	<div style={{display: 'flex', alignItems: 'center', marginRight: 10}}>
		<label style={{marginRight: 10, fontWeight: 'bold'}}>Group:</label>
		<PathGroupSelector {...props} />
	</div>

export default LabeledPathGroupSelector;
