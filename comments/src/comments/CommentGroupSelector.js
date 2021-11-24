import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';

import {Select} from 'dot11-components/general/Form';
import {getAllFieldValues} from 'dot11-components/store/appTableData';

const dataSet = 'comments';

function CommentGroupSelector({
	value,
	onChange,
	placeholder,
	...otherProps
}) {
	const loading = useSelector(state => state[dataSet].loading);
	let options = useSelector(state => getAllFieldValues(state, dataSet, 'CommentGroup').filter(v => v !== '').map(v => ({label: v, value: v}))); // remove blank entry (we use 'clear' to set blank)
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
