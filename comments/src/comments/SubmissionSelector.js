import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import styled from '@emotion/styled';

import Input from 'react-dropdown-select/lib/components/Input';
import {Select} from 'dot11-components/form';
import {getAllFieldValues} from 'dot11-components/store/appTableData';
import {dataSet} from '../store/comments';

/*
 * Render submission. If it looks like a DCN then link to mentor.
 */
 export const renderSubmission = (submission) => {
 	if (!submission)
 		return 'None'
	let text = submission
	let gg = '11'
 	let m = text.match(/^(\d{1,2})-/)
 	if (m) {
 		gg = ('0' + m[1]).slice(-2);
 		text = text.replace(/^\d{1,2}-/, '')
 	}
 	m = text.match(/(\d{2})\/(\d{1,4})r(\d+)/)
	if (m) {
		const yy = ('0' + m[1]).slice(-2);
		const nnnn = ('0000' + m[2]).slice(-4);
		const rr = ('0' + m[3]).slice(-2);
		const href = `https://mentor.ieee.org/802.11/dcn/${yy}/${gg}-${yy}-${nnnn}-${rr}`;
		return <a style={{pointerEvents: 'unset'}} href={href}>{submission}</a>
	}
	return submission
}

const contentRenderer = ({state, methods, props}) => 
	<React.Fragment>
		{state.values.length > 0 && renderSubmission(state.values[0].label)}
		<Input props={props} methods={methods} state={state} />
	</React.Fragment>

const ReadOnlyContainer = styled.div`
	background-color: #fafafa;
	border: 1px solid #ddd;
	padding: 0 5px;
	min-height: unset;
	box-sizing: border-box;
	line-height: 25px;
`;

function SubmissionSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const loading = useSelector(state => state[dataSet].loading);
	const options = useSelector(state => getAllFieldValues(state, dataSet, 'Submission').filter(v => v !== '').map(v => ({value: v, label: v})));
	const optionSelected = options.find(o => o.value === value);

	return (
		readOnly
			? <ReadOnlyContainer {...otherProps}>{renderSubmission(value)}</ReadOnlyContainer>
			: <Select
				values={(optionSelected && optionSelected.value !== '')? [optionSelected]: []}
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
