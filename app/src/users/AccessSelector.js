import PropTypes from 'prop-types'
//import React from 'react'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

function AccessSelector({value, onChange, options, dispatch, ...otherProps}) {

	function handleChange(value) {
		onChange(value.length === 0? 0: value[0].value)
	}

	const placeholder = value === '<multiple>'? value: 'Not assigned'
	const optionSelected = options.find(o => o.value === value)

	const selectCss = css`
		background-color: white;
		border: 1px solid #ddd;
		padding: 0;
		box-sizing: border-box;
		width: unset;
	`

	return (
		<div {...otherProps}>
			<Select
				css={selectCss}
				values={optionSelected? [optionSelected]: []}
				onChange={handleChange}
				options={options}
				placeholder={placeholder}
			/>
		</div>
	)
}
AccessSelector.propTypes = {
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired,
	options: PropTypes.array.isRequired,
}

export default connect(
	(state) => {
		return {
			options: state.users.accessOptions
		}
	}
)(AccessSelector)