import PropTypes from 'prop-types';
import React from 'react';

import {Select} from 'dot11-components/form';

import {StatusOptions} from '../store/members';

function StatusSelector({
	value,
	onChange,
	...otherProps
}) {
	const optionSelected = StatusOptions.find(o => o.value === value)
	const handleChange = value => onChange(value.length === 0? 0: value[0].value)

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={StatusOptions}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

StatusSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired
}

export default StatusSelector;
