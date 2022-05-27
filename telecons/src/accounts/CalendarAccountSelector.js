import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import {Select} from 'dot11-components/form';

import {selectCalendarAccountsState} from '../store/calendarAccounts';

function CalendarAccountSelector({
	value,
	onChange,
	...otherProps
}) {
	const {loading, ids, entities} = useSelector(selectCalendarAccountsState);

	const options = React.useMemo(() => ids.map(id => ({value: id, label: entities[id].name})), [ids, entities]);
	const optionSelected = options.find(o => o.value === value);

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue);
	}

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			{...otherProps}
		/>
	)
}

CalendarAccountSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default CalendarAccountSelector;
