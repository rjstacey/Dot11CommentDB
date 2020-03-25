import PropTypes from 'prop-types'
import React, {useEffect} from 'react'
import {connect} from 'react-redux'
import Select from 'react-select'
import {getUsers} from './actions/users'

const style = {
	display: 'inline-block',
	width: 200,
}

function Assignee(props) {
	const {value, onChange, usersValid, users, dispatch} = props

	useEffect(() => {
		if (!usersValid) {
			dispatch(getUsers())
		}
	}, [])

	const options =
		[{value: 0, label: 'Not Assigned'}]
		.concat(users.map(u => {
			return {value: u.SAPIN, label: `${u.Name} <${u.Email}>`}
		}));

	const customStyles = {
		container: (provided, state) => {return {...provided, ...style}},
		input: (provided, state) => {return {...provided, paddingTop: 0, paddingBottom: 0, margin: 0}},
		valueContainer: (provided, state) => {return {...provided, padding: 0}},
		control: (provided, state) => {return {...provided, minHeight: 0}},
		dropdownIndicator: (provided, state) => {return {...provided, padding: 0}}
	}

	function handleChange({value}, action) {
		onChange(value)
	}

	const placeholder = value === '<multiple>'? value: null
	const v = value === '<multiple>'? null: options.find(o => o.value === value)

	return (
		<Select
			name='Assignee'
			value={v}
			onChange={handleChange}
			options={options}
			styles={customStyles}
			placeholder={placeholder}
		/>
	)
}
Assignee.propTypes = {
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	onChange: PropTypes.func.isRequired,
	usersValid: PropTypes.bool.isRequired,
	users: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
}

export default connect((state) => {
	const {users} = state
	return {
		usersValid: users.usersValid,
		users: users.users
	}
})(Assignee)