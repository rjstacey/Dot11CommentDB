import React from 'react';
import {useSelector} from 'react-redux';
import {Select} from 'dot11-components';

import {selectCalendarAccountsState} from '../store/calendarAccounts';

function CalendarAccountSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {
	const {loading, ids, entities} = useSelector(selectCalendarAccountsState);
	const options = React.useMemo(() => ids.map(id => ({value: id, label: entities[id]!.name})), [ids, entities]);
	const values = options.filter(o => o.value === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value as number: null)

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

export default CalendarAccountSelector;
