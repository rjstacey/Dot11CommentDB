import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'

import {Select} from '../general/Form'

import {getAllFieldOptions} from '../store/dataSelectors'

function CommentGroupSelector({
	value,
	onChange,
	fieldOptions,
	loading,
	placeholder,
	width,
	...otherProps
}) {
	let options = fieldOptions.filter(o => o.value !== '');	// remove blank entry (we use 'clear' to set blank)
	let optionSelected = options.find(o => o.value === value);
	if (value && !optionSelected) {
		// Make sure the current value is an option
		options = options.concat({label: value, value});
		optionSelected = options[options.length - 1];
	}

	return (
		<Select
			width={width}
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
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	placeholder: PropTypes.string,
	fieldOptions: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
}

const dataSet = 'comments'
export default connect(
	(state) => ({
		fieldOptions: getAllFieldOptions(state, dataSet, 'CommentGroup'),
		loading: state[dataSet].loading
	})
)(CommentGroupSelector)
