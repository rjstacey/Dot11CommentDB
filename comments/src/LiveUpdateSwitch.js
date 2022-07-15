import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SliderSwitch} from 'dot11-components/form';

import {selectLiveUpdateState, setLiveUpdate} from './store/liveUpdate'

function LiveUpdateSwitch() {
	const {live} = useSelector(selectLiveUpdateState);
	const dispatch = useDispatch();
	const setLive = (live) => dispatch(setLiveUpdate(live));

	return (
		<div style={{display: 'flex', alignItems: 'center'}}>
			<label>Live updates:</label>
			<SliderSwitch checked={live} onChange={() => setLive(!live)} />
		</div>
	)
}

export default LiveUpdateSwitch;
