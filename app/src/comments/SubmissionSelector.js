import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {Select} from '../general/Form'
import {getAllFieldOptions} from '../store/options'

function SubmissionSelector({
	value,
	onChange,
	fieldOptions,
	loading,
	width,
	...otherProps
}) {
	const options = fieldOptions.filter(o => o.value !== '');	// remove blank entry (we use 'clear' to set blank)
	const optionSelected = options.find(o => o.value === value);

	return (
		<Select
			width={width}
			values={(optionSelected && optionSelected.value !== '')? [optionSelected]: []}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			options={options}
			loading={loading}
			create
			clearable
			{...otherProps}
		/>
	)
}

SubmissionSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	placeholder: PropTypes.string,
	fieldOptions: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
}

const dataSet = 'comments'
export default connect(
	(state, ownProps) => ({
		fieldOptions: getAllFieldOptions(state, dataSet, 'Submission'),
		loading: state[dataSet].loading
	})
)(SubmissionSelector)