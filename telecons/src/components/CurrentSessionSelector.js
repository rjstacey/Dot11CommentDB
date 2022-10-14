import {useDispatch, useSelector} from 'react-redux';

import {selectCurrentSessionId, setCurrentSessionId} from '../store/current';
import SessionSelector from './SessionSelector';

export function CurrentSessionSelector({onChange, ...otherProps}) {
	const dispatch = useDispatch();
	const sessionId = useSelector(selectCurrentSessionId);
	const handleChange = (sessionId) => {
		dispatch(setCurrentSessionId(sessionId));
		if (onChange)
			onChange(sessionId);
	}
	return (
		<SessionSelector
			value={sessionId}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

const LabeledCurrentSessionSelector = (props) =>
	<div style={{display: 'flex', alignItems: 'center'}}>
		<label style={{marginRight: 10, fontWeight: 'bold'}}>Session:</label>
		<CurrentSessionSelector {...props} />
	</div>

export default LabeledCurrentSessionSelector;