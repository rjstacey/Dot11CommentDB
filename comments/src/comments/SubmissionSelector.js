import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';

import Input from 'react-dropdown-select/lib/components/Input';
import {Select} from 'dot11-components/form';
import {selectAllFieldValues} from 'dot11-components/store/appTableData';

const dataSet = 'comments';
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

const contentRenderer = ({state, methods, props}) => 
	<>
		{state.values.length > 0 && renderSubmission(state.values[0].label)}
		<Input props={props} methods={methods} state={state} />
	</>

const selectFieldValues = state => 
	selectAllFieldValues(state, dataSet, field)
		.filter(v => v !== '') // remove blank entry (we use 'clear' to set blank)
		.map(v => ({label: v, value: v}));

const selectLoading = state => state[dataSet].loading;

function SubmissionSelector({
	value,
	onChange,
	...otherProps
}) {
	const loading = useSelector(selectLoading);
	const options = useSelector(selectFieldValues);
	const optionSelected = options.find(o => o.value === value);

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			options={options}
			loading={loading}
			create
			clearable
			contentRenderer={contentRenderer}
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
