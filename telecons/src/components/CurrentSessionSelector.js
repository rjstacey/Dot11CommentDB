import {useDispatch, useSelector} from 'react-redux';

import {selectCurrentMeetingId, setCurrentMeetingId} from '../store/current';
import ImatMeetingSelector from './ImatMeetingSelector';

export function CurrentSessionSelector({onChange, ...otherProps}) {
	const dispatch = useDispatch();
	const meetingId = useSelector(selectCurrentMeetingId);
	const handleChange = (meetingId) => {
		dispatch(setCurrentMeetingId(meetingId));
		if (onChange)
			onChange(meetingId);
	}
	return (
		<ImatMeetingSelector
			value={meetingId}
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