import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import {getUsers} from '../actions/users'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

function AssigneeSelector({value, onChange, valid, loading, options, getOptions, ...otherProps}) {

	React.useEffect(() => {
		if (!valid) {
			getOptions()
		}
	}, [])

	function handleChange(value) {
		onChange(value.length === 0? 0: value[0].value)
	}

	const placeholder = value === '<multiple>'? value: 'Not assigned'
	const optionSelected = value === '<multiple>'? undefined: options.find(o => o.value === value)

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
				loading={loading}
				clearable
				placeholder={placeholder}
			/>
		</div>
	)
}
AssigneeSelector.propTypes = {
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	onChange: PropTypes.func.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	options: PropTypes.array.isRequired,
	getOptions: PropTypes.func.isRequired,
}

export default connect(
	(state) => {
		const {users} = state
		return {
			valid: users.usersValid,
			loading: users.getUsers,
			options: users.users.map(u => {return {value: u.SAPIN, label: `${u.Name}`}})
		}
	},
	(dispatch) => {
		return {
			getOptions: () => dispatch(getUsers())
		}
	}
)(AssigneeSelector)