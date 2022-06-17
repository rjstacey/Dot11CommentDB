import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Select} from 'dot11-components/form';

import {selectImatCommitteesState, loadCommittees} from '../store/imatCommittees';

function ImatCommitteeSelector({
	value,
	onChange,
	parent_id,
	types,
	multi,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, entities, ids} = useSelector(selectImatCommitteesState);
	
	React.useEffect(() => {
		if (!valid)
			dispatch(loadCommittees('802.11'));
	}, []);

	const options = React.useMemo(() => ids.map(id => entities[id]), [ids, entities]);

	const values = options.filter(o => o.id === value);

	const handleChange = React.useCallback((values) => {
		if (values.length)
			onChange(values[0].id);
		else
			onChange(null);
	}, [onChange]);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			valueField='id'
			labelField='shortName'
			{...otherProps}
		/>
	)
}

ImatCommitteeSelector.propTypes = {
	value: PropTypes.any,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export default ImatCommitteeSelector;
