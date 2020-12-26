import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import styled from '@emotion/styled'
import {getAllFieldOptions} from '../selectors/options'

const StyledSelect = styled(Select)`
	background-color: white;
	border: 1px solid #ddd;
	padding: 0;
	box-sizing: border-box;
	width: ${({width}) => typeof width === 'undefined'? 'unset': (width + (typeof width === 'number'? 'px': ''))};
	& .react-dropdown-select-input {
		font-size: unset;
		&::placeholder {
			font-style: italic;
			color: GreyText;
		}
	}
`;

function AdHocSelector({
	value,
	onChange,
	fieldOptions,
	loading,
	placeholder,
	width
}) {
	const options = fieldOptions.filter(o => o.value !== '');	// remove blank entry (we use 'clear' to set blank)
	const optionSelected = options.find(o => o.value === value);

	return (
		<StyledSelect
			width={width}
			values={optionSelected? [optionSelected]: []}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			options={options}
			loading={loading}
			create
			clearable
			placeholder={placeholder}
		/>
	)
}

AdHocSelector.propTypes = {
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
		fieldOptions: getAllFieldOptions(state, dataSet, 'AdHoc'),
		loading: state[dataSet].loading
	})
)(AdHocSelector)
