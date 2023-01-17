import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useHistory, useLocation} from 'react-router-dom';

import {selectCurrentSessionId, setCurrentSessionId} from '../store/current';
import SessionSelector from './SessionSelector';

export function PathSessionSelector({onChange, ...otherProps}) {
	const dispatch = useDispatch();
	const sessionId = useSelector(selectCurrentSessionId);
	const history = useHistory();
	const location = useLocation();

	React.useEffect(() => {
		const components = location.pathname.split('/');
		let pathSessionId = 0;
		try {pathSessionId = parseInt(components[2])} catch (err) {}
		if (pathSessionId) {
			if (pathSessionId !== sessionId)
				dispatch(setCurrentSessionId(pathSessionId));
		}
		else {
			if (sessionId)
				dispatch(setCurrentSessionId(null))
		}
	}, [dispatch, location, sessionId]);

	const handleChange = (sessionId) => {
		dispatch(setCurrentSessionId(sessionId));
		if (onChange)
			onChange(sessionId);
		const components = location.pathname.split('/');
		components[2] = sessionId || '*';
		history.push(components.join('/'));
	}

	return (
		<SessionSelector
			value={sessionId}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

PathSessionSelector.propTypes = {
	onChange: PropTypes.func,
}

const LabeledPathSessionSelector = (props) =>
	<div style={{display: 'flex', alignItems: 'center'}}>
		<label style={{marginRight: 10, fontWeight: 'bold'}}>Session:</label>
		<PathSessionSelector {...props} />
	</div>

export default LabeledPathSessionSelector;