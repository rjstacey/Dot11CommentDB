import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Select} from 'dot11-components/form';

import {loadWebexAccounts, dataSet} from '../store/webexAccounts';

function WebexAccountSelector({
	style,
	className,
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {loading, valid, ids, entities} = useSelector(state => state[dataSet]);

	React.useEffect(() => {
		if (!valid && !readOnly)
			dispatch(loadWebexAccounts());
	}, [dispatch, valid, readOnly]);

	const options = React.useMemo(() => ids.map(id => ({value: id, label: entities[id].name})), [ids, entities]);
	const optionSelected = options.find(o => o.value === value);
	const values = optionSelected? [optionSelected]: [];

	const handleChange = React.useCallback((values) => {
		const newValue = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue);
	}, [value, onChange]);

	return (
		<Select
			style={style}
			className={className}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

WebexAccountSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default WebexAccountSelector;