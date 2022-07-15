import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import {createSelector} from '@reduxjs/toolkit';

import {Select} from 'dot11-components/form';
import {selectAllFieldValues} from 'dot11-components/store/appTableData';
import {selectCommentsState, dataSet} from '../store/comments';

const field = 'Submission';

/*
 * Render submission. If it looks like a DCN then link to mentor.
 */
 export const renderSubmission = (submission) => {
 	if (!submission)
 		return '';
	let text = submission;
	let gg = '11';
 	let m = text.match(/^(\d{1,2})-/);
 	if (m) {
 		gg = ('0' + m[1]).slice(-2);
 		text = text.replace(/^\d{1,2}-/, '');
 	}
 	m = text.match(/(\d{2})\/(\d{1,4})r(\d+)/);
	if (m) {
		const yy = ('0' + m[1]).slice(-2);
		const nnnn = ('0000' + m[2]).slice(-4);
		const rr = ('0' + m[3]).slice(-2);
		const href = `https://mentor.ieee.org/802.11/dcn/${yy}/${gg}-${yy}-${nnnn}-${rr}`;
		return <a style={{pointerEvents: 'unset'}} href={href}>{submission}</a>
	}
	return submission;
}

const selectItemRenderer = ({item, state, methods, props}) => renderSubmission(item.label);

const selectFieldValues = createSelector(
	state => selectAllFieldValues(state, dataSet, field),
	values => values
		.filter(v => v !== '') // remove blank entry (we use 'clear' to set blank)
		.map(v => ({label: v, value: v}))
);

const selectLoading = state => selectCommentsState(state).loading;

function SubmissionSelector({
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
			selectItemRenderer={selectItemRenderer}
			{...otherProps}
		/>
	)
}

SubmissionSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	placeholder: PropTypes.string,
}

export default SubmissionSelector;
