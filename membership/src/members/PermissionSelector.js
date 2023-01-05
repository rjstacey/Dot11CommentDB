import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';

import {Select} from 'dot11-components/form';

import {selectPermissions} from '../store/permissions';

function PermissionSelector({
	value,
	onChange,
	...otherProps
}) {
	const permissions = useSelector(selectPermissions);
	const values = permissions.filter(o => o.scope === value);
	const handleChange = values => onChange(values.length === 0? null: values[0].scope);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={permissions}
			valueField='scope'
			labelField='description'
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

PermissionSelector.propTypes = {
	value: PropTypes.any,
	onChange: PropTypes.func.isRequired
}

export default PermissionSelector;
