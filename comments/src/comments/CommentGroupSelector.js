import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';

import {Select} from 'dot11-components/form';
import {selectAllFieldValues} from 'dot11-components/store/appTableData';

const dataSet = 'comments';
const field = 'CommentGroup';

const selectFieldValues = state => 
	selectAllFieldValues(state, dataSet, field)
		.filter(v => v !== '')
		.map(v => ({label: v, value: v})); // remove blank entry (we use 'clear' to set blank)

const selectLoading = state => state[dataSet].loading;

function CommentGroupSelector({
	value,
	onChange,
	placeholder,
	...otherProps
}) {
	const loading = useSelector(selectLoading);
	let options = useSelector(selectFieldValues);
	let optionSelected = options.find(o => o.value === value);
	if (value && !optionSelected) {
		// Make sure the current value is an option
		options = options.concat({label: value, value});
		optionSelected = options[options.length - 1];
	}

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			options={options}
			loading={loading}
			create
			clearable
			placeholder={placeholder}
			{...otherProps}
		/>
	)
}

CommentGroupSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	placeholder: PropTypes.string,
}

export default CommentGroupSelector;
