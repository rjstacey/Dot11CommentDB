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
	width: ${({width}) => typeof width === 'undefined'? 'unset': (width + (typeof width === 'number'? 'px': ''))}`

function CommentGroupSelector({
	value,
	onChange,
	comments,
	loading,
	placeholder,
	width
}) {

	const options = React.useMemo(() => {
		return [...new Set(comments.map(c => c['CommentGroup']))].map(v => ({value: v, label: v}))
	}, [comments]);

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
	comments: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	placeholder: PropTypes.string,
}

export default connect(
	(state) => {
		const {comments} = state
		return {
			comments: comments.comments,
			loading: comments.getComments
		}
	}
)(CommentGroupSelector)
