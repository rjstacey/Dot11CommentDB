import PropTypes from 'prop-types';
import React from 'react';
import {Select} from 'dot11-components/form';

const groups = ["802.11", "802.15"];

function GroupsSelector({
	style,
	className,
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const options = groups.map(g => ({value: g, label: g}));
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
			multi
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

GroupsSelector.propTypes = {
	value: PropTypes.array,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default GroupsSelector;

