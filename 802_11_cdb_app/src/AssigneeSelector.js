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
	const {value, onChange} = props

	useEffect(() => {
		if (!props.usersDataValid) {
			props.dispatch(getUsers())
		}
	}, [])

	const options =
		[{value: 0, label: 'Not Assigned'}]
		.concat(props.usersData.map(u => {
			return {value: u.SAPIN, label: `${u.Name} <${u.Email}>`}
		}));

	const customStyles = {
		container: (provided, state) => {return {...provided, ...style}},
		input: (provided, state) => {return {...provided, paddingTop: 0, paddingBottom: 0, margin: 0}},
		valueContainer: (provided, state) => {return {...provided, padding: 0}},
		control: (provided, state) => {return {...provided, minHeight: 0}},
		dropdownIndicator: (provided, state) => {return {...provided, padding: 0}}
	}

	return (
		<Select
			name='Assignee'
			value={value || 0}
			onChange={onChange}
			options={options}
			styles={customStyles}
		/>
	)
}
Assignee.propTypes = {
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired,
	usersDataValid: PropTypes.bool.isRequired,
	usersData: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
}

export default connect((state) => {
	const {users} = state
	return {
		usersDataValid: users.usersDataValid,
		usersData: users.usersData
	}
})(Assignee)