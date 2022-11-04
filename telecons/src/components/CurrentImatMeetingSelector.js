import {useDispatch, useSelector} from 'react-redux';

import {selectCurrentImatMeetingId, setCurrentImatMeetingId} from '../store/current';
import ImatMeetingSelector from './ImatMeetingSelector';

export function CurrentImatMeetingSelector({onChange, ...otherProps}) {
	const dispatch = useDispatch();
	const imatMeetingId = useSelector(selectCurrentImatMeetingId);
	const handleChange = (sessionId) => {
		dispatch(setCurrentImatMeetingId(sessionId));
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

const LabeledCurrentImatMeetingSelector = (props) =>
	<div style={{display: 'flex', alignItems: 'center'}}>
		<label style={{marginRight: 10, fontWeight: 'bold'}}>IMAT meeting:</label>
		<CurrentImatMeetingSelector {...props} />
	</div>

export default LabeledCurrentImatMeetingSelector;