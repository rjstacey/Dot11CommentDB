import React from 'react'
import PropTypes from 'prop-types'
import {Select} from '../general/Form'

import {AccessLevelOptions} from '../store/actions/users'

function AccessSelector({
	value,
	onChange,
	...otherProps
}) {
	const optionSelected = AccessLevelOptions.find(o => o.value === value)
	const handleChange = value => onChange(value.length === 0? 0: value[0].value)

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={AccessLevelOptions}
			//portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

AccessSelector.propTypes = {
	value: PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired
}

export default AccessSelector;
