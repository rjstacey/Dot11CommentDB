import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import styled from '@emotion/styled'

const StyledSelect = styled(Select)`
	background-color: white;
	border: 1px solid #ddd;
	padding: 0;
	box-sizing: border-box;
	width: unset;
	min-width: 160px
`;

function AccessSelector({value, onChange, options, dispatch, ...otherProps}) {

	const optionSelected = options.find(o => o.value === value)
	const handleChange = value => onChange(value.length === 0? 0: value[0].value)
	const placeholder = value === '<multiple>'? value: 'Not assigned'

	return (
		<StyledSelect
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			placeholder={placeholder}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

AccessSelector.propTypes = {
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired,
	options: PropTypes.array.isRequired,
}

export default connect(
	(state) => ({options: state.users.accessOptions})
)(AccessSelector)