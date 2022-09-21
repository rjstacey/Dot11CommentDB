import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import {Select} from 'dot11-components/form';

import {selectWebexAccountsState} from '../store/webexAccounts';

function WebexTemplateSelector({
	value,
	onChange,
	accountId,
	...otherProps
}) {
	const {loading, entities} = useSelector(selectWebexAccountsState);

	const options = React.useMemo(() => {
		const account = entities[accountId];
		return account? account.templates || []: [];
		//return account?.template || [];
	}, [accountId, entities]);

	let values = options.filter(o => o.id === value);

	React.useEffect(() => {
		if (values.length === 0) {
			const defaults = options.filter(o => o.isDefault);
			if (defaults.length > 0)
				onChange(defaults[0].id);
		}
	}, [options, onChange, values.length]);

	const handleChange = React.useCallback((selected) => {
		const id = selected.length > 0? selected[0].id: null;
		if (id !== value)
			onChange(id);
	}, [value, onChange]);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			labelField='name'
			valueField='id'
			{...otherProps}
		/>
	)
}

WebexTemplateSelector.propTypes = {
	value: PropTypes.any,
	onChange: PropTypes.func.isRequired,
	accountId: PropTypes.any,
	readOnly: PropTypes.bool
}

export default WebexTemplateSelector;
