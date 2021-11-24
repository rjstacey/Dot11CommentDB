import React from 'react'
import PropTypes from 'prop-types'
import {useDispatch, useSelector} from 'react-redux'
import {Select} from 'dot11-components/general/Form'

import {loadCalendarAccounts, dataSet} from './store/calendarAccounts'

function CalendarAccountSelector({
	style,
	className,
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {loading, valid, ids, entities} = useSelector(state => state[dataSet]);

	React.useEffect(() => {
		if (!valid && !readOnly)
			dispatch(loadCalendarAccounts());
	}, [dispatch, valid, readOnly]);

	const options = React.useMemo(() => ids.map(id => ({value: id, label: entities[id].name})), [ids, entities]);
	const optionSelected = options.find(o => o.value === value);

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue);
	}

	return (
		<Select
			style={style}
			className={className}
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			readOnly={readOnly}
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
