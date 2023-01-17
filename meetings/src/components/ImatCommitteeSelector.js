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
	}, [dispatch, valid]);

	const options = React.useMemo(() => ids.map(id => entities[id]), [ids, entities]);

	const values = options.filter(o => o.symbol === value);

	const handleChange = React.useCallback((values) => onChange(values.length? values[0].symbol: null), [onChange]);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			valueField='symbol'
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
