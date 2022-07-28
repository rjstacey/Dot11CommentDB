import PropTypes from 'prop-types';
import React from 'react';
import {Select} from 'dot11-components/form';

const positions = ["Chair", "Vice chair", "Secretary", "Technical editor", "Other"];

function OfficerPositionSelector({
	value,
	onChange,
	...otherProps
}) {
	const options = positions.map(v => ({value: v, label: v}));
	const values = options.filter(o => o.value === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].value: '');

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

OfficerPositionSelector.propTypes = {
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default OfficerPositionSelector;
