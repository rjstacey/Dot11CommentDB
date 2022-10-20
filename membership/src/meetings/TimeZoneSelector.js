import React from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {Select} from 'dot11-components/form';
import {loadTimeZones, selectTimeZonesState} from '../store/sessions';

function TimeZoneSelector({
	value,
	onChange,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, timeZones} = useSelector(selectTimeZonesState);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadTimeZones());
	}, []);

	const options = React.useMemo(() => timeZones.map(tz => ({value: tz, label: tz})), [timeZones]);

	const handleChange = (values) => onChange(values.length > 0? values[0].value: null);

	const values = options.filter(o => o.value === value);

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

TimeZoneSelector.propTypes = {
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
}

export default TimeZoneSelector;
