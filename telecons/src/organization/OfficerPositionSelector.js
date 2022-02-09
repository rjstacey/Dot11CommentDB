import PropTypes from 'prop-types';
import React from 'react';
import {Select} from 'dot11-components/form';

const positions = ["Chair", "Vice chair", "Secretary", "Technical editor", "Other"];

function OfficerPositionSelector({
	style,
	className,
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const options = positions.map(v=> ({value: v, label: v}));
	const optionsSelected = value? value.map(v => options.find(o => o.value === v)): [];

	function handleChange(values) {
		const newValue = values.map(v => v.value);
		onChange(newValue);
	}

	return (
		<Select
			style={style}
			className={className}
			values={optionsSelected}
			onChange={handleChange}
			options={options}
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

OfficerPositionSelector.propTypes = {
	value: PropTypes.array,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default OfficerPositionSelector;

