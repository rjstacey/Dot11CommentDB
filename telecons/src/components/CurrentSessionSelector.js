import {useDispatch, useSelector} from 'react-redux';

import {selectCurrentMeetingId, setCurrentMeetingId} from '../store/current';
import ImatMeetingSelector from './ImatMeetingSelector';

function CurrentSessionSelector({onChange, ...otherProps}) {
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

export default CurrentSessionSelector;
