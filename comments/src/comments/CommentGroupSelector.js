import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import {createSelector} from '@reduxjs/toolkit';

import {Select} from 'dot11-components/form';
import {selectAllFieldValues} from 'dot11-components/store/appTableData';
import {selectCommentsState, dataSet} from '../store/comments';

const field = 'CommentGroup';

const selectFieldValues = createSelector(
	state => selectAllFieldValues(state, dataSet, field),
	values => values
		.filter(v => v !== '') // remove blank entry (we use 'clear' to set blank)
		.map(v => ({label: v, value: v}))
);

const selectLoading = state => selectCommentsState(state).loading;

function CommentGroupSelector({
	value,
	onChange,
	...otherProps
}) {
	const loading = useSelector(selectLoading);
	let options = useSelector(selectFieldValues);
	let values = options.filter(o => o.value === value);

	if (value && values.length === 0) {
		// Make sure the current value is an option
		const option = {label: value, value};
		options = options.concat(value);
		values = [option];
	}

	const handleChange = (values) => onChange(values.length? values[0].value: '');

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
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
