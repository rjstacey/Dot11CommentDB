import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';

import {Select} from 'dot11-components/form';

import {selectGroupsState} from '../store/groups';
import {selectCurrentGroupId} from '../store/current';

export function GroupSelector({
	value,
	onChange,
	types,
	multi,
	...otherProps
}) {
	const parentId = useSelector(selectCurrentGroupId);
	const {entities, ids} = useSelector(selectGroupsState);

	const groups = React.useMemo(() => {
		let groups = ids.map(id => entities[id]);
		if (types)
			groups = groups.filter(group => types.includes(group.type));
		if (parentId)
			groups = groups.filter(group => group.id === parentId || group.parent_id === parentId);
		return groups;
	}, [parentId, entities, ids, types]);

	const handleChange = React.useCallback((values) => {
		let newValues;
		if (multi)
			newValues = values.map(group => group.id);
		else
			newValues = values.length > 0? values[0].id: 0;
		onChange(newValues);
	}, [multi, onChange]);

	let values;
	if (value) {
		if (multi)
			values = value.map(id => entities[id] || {id, name: 'Unknown'});
		else
			values = [entities[value] || {id: value, name: 'Unknown'}];
	}
	else {
		values = [];
	}

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={groups}
			multi={multi}
			clearable={!multi}
			valueField='id'
			labelField='name'
			{...otherProps}
		/>
	)
}

GroupSelector.propTypes = {
	value: PropTypes.any,
	onChange: PropTypes.func.isRequired,
	parent_id: PropTypes.any,
	types: PropTypes.array,
	multi: PropTypes.bool,
	readOnly: PropTypes.bool,
}

export default GroupSelector;
