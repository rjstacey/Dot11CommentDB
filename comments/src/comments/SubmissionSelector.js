import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import Input from 'react-dropdown-select/lib/components/Input'
import {Select} from 'dot11-components/general/Form'
import {getAllFieldValues} from 'dot11-components/store/dataSelectors'

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
	fieldValues,
	loading,
	readOnly,
	width,
	...otherProps
}) {
	const options = fieldValues.map(v => ({value: v, label: v})).filter(o => o.value !== '');	// remove blank entry (we use 'clear' to set blank)
	const optionSelected = options.find(o => o.value === value);

	return (
		readOnly
			? <ReadOnlyContainer {...otherProps}>{renderSubmission(value)}</ReadOnlyContainer>
			: <Select
				width={width}
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
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	placeholder: PropTypes.string,
	fieldValues: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
}

const dataSet = 'comments'
export default connect(
	(state) => ({
		fieldValues: getAllFieldValues(state, dataSet, 'Submission'),
		loading: state[dataSet].loading
	})
)(SubmissionSelector)
