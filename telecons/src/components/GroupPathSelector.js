import PropTypes from 'prop-types';
import React from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useHistory, useLocation} from 'react-router-dom';

import {Select} from 'dot11-components/form';

import {selectGroupsState} from '../store/groups';
import {selectCurrentGroupId, setCurrentGroupId} from '../store/current';

const types = ['c', 'wg'];

export function GroupPathSelector({
	onChange,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {entities, ids} = useSelector(selectGroupsState);
	const groupId = useSelector(selectCurrentGroupId);
	const history = useHistory();
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
		history.push(components.join('/'));
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

GroupPathSelector.propTypes = {
	onChange: PropTypes.func,
}

const LabeledGroupPathSelector = (props) =>
	<div style={{display: 'flex', alignItems: 'center'}}>
		<label style={{marginRight: 10, fontWeight: 'bold'}}>Group:</label>
		<GroupPathSelector {...props} />
	</div>

export default LabeledGroupPathSelector;