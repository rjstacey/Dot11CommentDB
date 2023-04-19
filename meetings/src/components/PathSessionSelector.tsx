import React from 'react';
import {useNavigate, useLocation} from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {selectCurrentSessionId, setCurrentSessionId} from '../store/current';
import SessionSelector from './SessionSelector';

export function PathSessionSelector({
	onChange,
	...otherProps
}: {
	onChange?: (sessionId: number | null) => void;
} & Omit<React.ComponentProps<typeof SessionSelector>, "value" | "onChange">) {
	const dispatch = useAppDispatch();
	const sessionId = useAppSelector(selectCurrentSessionId);
	const navigate = useNavigate();
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

	const handleChange = (sessionId: number | null) => {
		dispatch(setCurrentSessionId(sessionId));
		if (onChange)
			onChange(sessionId);
		const components = location.pathname.split('/');
		components[2] = '' + (sessionId || '*');
		navigate(components.join('/'));
	}

	return (
		<SessionSelector
			value={sessionId}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

const LabeledPathSessionSelector = (props: React.ComponentProps<typeof PathSessionSelector>) =>
	<div style={{display: 'flex', alignItems: 'center'}}>
		<label style={{marginRight: 10, fontWeight: 'bold'}}>Session:</label>
		<PathSessionSelector {...props} />
	</div>

export default LabeledPathSessionSelector;