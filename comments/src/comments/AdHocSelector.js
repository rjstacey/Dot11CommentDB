import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {Select} from 'dot11-components/general/Form'
import {getAllFieldValues} from 'dot11-components/store/appTableData'

function AdHocSelector({
	value,
	onChange,
	fieldValues,
	loading,
	placeholder,
	width,
	...otherProps
}) {

	let options = fieldValues
		.map(v => ({value: v, label: v}))
		.filter(o => o.value !== '');	// remove blank entry (we use 'clear' to set blank)
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

AdHocSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	placeholder: PropTypes.string,
	fieldValues: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
}

const dataSet = 'comments';

export default connect(
	(state) => ({
		fieldValues: getAllFieldValues(state, dataSet, 'AdHoc'),
		loading: state[dataSet].loading
	})
)(AdHocSelector)
