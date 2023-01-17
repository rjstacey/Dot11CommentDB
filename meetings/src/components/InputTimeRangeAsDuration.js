import PropTypes from 'prop-types';
import React from 'react';
import {Input} from 'dot11-components/form';

function timeRangeToDuration(startTime, endTime) {
	let [startH, startM] = startTime.split(':');
	let [endH, endM] = endTime.split(':');
	try {
		startH = startH? parseInt(startH): 0;
		startM = startM? parseInt(startM): 0;
		endH = endH? parseInt(endH): 0;
		endM = endM? parseInt(endM): 0;
		let d = endH - startH + (endM - startM)/60;
		if (d < 0) {
			// If less than zero, assume endTime is next day
			d = endH + 24 - startH + (endM - startM)/60;
		}
		const hh = Math.floor(d);
		const mm = (d - hh)*60;
		if (mm)
			return '' + hh + ':' + ('0' + mm).slice(-2);
		else
			return '' + hh;
	}
	catch (error) {
		return '';
	}
}

function endTimeFromDuration(startTime, duration) {
	let d = duration.trim();
	let m = /^(\d+):(\d{2})$/.exec(d);
	if (m) {
		d = parseInt(m[1]) + parseInt(m[2])/60;
	}
	else {
		m = /^(\d*\.?\d+)$/.exec(d);
		if (m) {
			d = parseFloat(d);
		}
		else {
			return undefined;
		}
	}
	let [startH, startM] = startTime.split(':');
	startH = parseInt(startH);
	startM = parseInt(startM);
	const endHour = startH + startM*60 + d;
	let endH = Math.floor(endHour);
	const endM = (endHour - endH)*60;
	// If endH is next day, then reduce by 24 hours
	if (endH >= 24)
		endH = endH - 24;
	return '' + endH + ':' + ('0' + endM).slice(-2);
}

function InputTimeRangeAsDuration({entry, changeEntry, ...otherProps}) {

	const [duration, setDuration] = React.useState(timeRangeToDuration(entry.startTime, entry.endTime) || '');
	const [hasError, setHasError] = React.useState(false);

	React.useEffect(() => {
		const d = timeRangeToDuration(entry.startTime, entry.endTime);
		if (typeof d === 'string')
			setDuration(d);
	}, [entry.startTime, entry.endTime]);

	function handleSetDuration(duration) {
		setDuration(duration);
		if (duration) {
			const endTime = endTimeFromDuration(entry.startTime, duration);
			if (endTime) {
				setHasError(false);
				if (endTime !== entry.endTime)
					changeEntry({endTime});
			}
			else {
				setHasError(true);
			}
		}
	}

	const style = hasError? {border: '1px dashed red'}: undefined

	return (
		<Input
			style={style}
			type='search'
			value={duration}
			onChange={e => handleSetDuration(e.target.value)}
			{...otherProps}
		/>
	)
}

InputTimeRangeAsDuration.propTypes = {
	entry: PropTypes.shape({
		startTime: PropTypes.string.isRequired,
		endTime: PropTypes.string.isRequired
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default InputTimeRangeAsDuration;
