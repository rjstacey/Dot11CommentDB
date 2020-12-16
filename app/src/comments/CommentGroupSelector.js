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
	width: ${({width}) => typeof width === 'undefined'? 'unset': (width + (typeof width === 'number'? 'px': ''))}
`;

function CommentGroupSelector({
	value,
	onChange,
	options,
	loading,
	placeholder,
	width
}) {

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

CommentGroupSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	placeholder: PropTypes.string,
	options: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
}

const dataSet = 'comments'
export default connect(
	(state, ownProps) => ({
		options: getAllFieldOptions(state, dataSet, 'CommentGroup'),
		loading: state[dataSet].loading
	})
)(CommentGroupSelector)
