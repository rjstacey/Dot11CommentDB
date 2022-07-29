import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import {
	selectTeleconEntities,
	getField as getTeleconField
} from '../store/telecons';

function TeleconSummary({teleconId}) {
	const teleconEntities = useSelector(selectTeleconEntities);
	const telecon = teleconEntities[teleconId];
	const textDecoration = telecon.isCancelled? 'line-through': 'none';
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<span style={{textDecoration}}>
				{telecon.summary}
			</span>
			<span style={{fontStyle: 'italic', fontSize: 'smaller', textDecoration}}>
				{getTeleconField(telecon, 'date')} {getTeleconField(telecon, 'timeRange')}
			</span>
		</div>
	)
}

TeleconSummary.propTypes = {
	teleconId: PropTypes.any.isRequired
}

export default TeleconSummary;
