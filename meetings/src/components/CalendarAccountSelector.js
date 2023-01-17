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
	const values = options.filter(o => o.value === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].value: null)

	return (
		<Select
			values={values}
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
