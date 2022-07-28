import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import {Select} from 'dot11-components/form';

import {selectWebexAccountsState} from '../store/webexAccounts';

function WebexAccountSelector({
	value,
	onChange,
	...otherProps
}) {
	const {loading, ids, entities} = useSelector(selectWebexAccountsState);
	const options = React.useMemo(() => ids.map(id => entities[id]), [ids, entities]);
	const values = options.filter(o => o.id === value);

	const handleChange = React.useCallback((selected) => {
		const id = selected.length > 0? selected[0].id: null;
		if (id !== value)
			onChange(id);
	}, [value, onChange]);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			labelField='name'
			valueField='id'
			{...otherProps}
		/>
	)
}

WebexAccountSelector.propTypes = {
	value: PropTypes.any,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default WebexAccountSelector;
