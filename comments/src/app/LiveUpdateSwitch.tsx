import React from 'react';

import {SliderSwitch} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectLiveUpdateState, setLiveUpdate } from '../store/liveUpdate'

function LiveUpdateSwitch({className}: {className?: string}) {
	const {live} = useAppSelector(selectLiveUpdateState);
	const dispatch = useAppDispatch();
	const setLive = (live: boolean) => dispatch(setLiveUpdate(live));

	return (
		<div className={className} style={{display: 'flex', alignItems: 'center'}}>
			<label>Live updates:</label>
			<SliderSwitch value={live} onChange={() => setLive(!live)} />
		</div>
	)
}

export default LiveUpdateSwitch;
