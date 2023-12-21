import React from "react";

import { SliderSwitch } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectLiveUpdateState, setLiveUpdate } from "../store/liveUpdate";

function LiveUpdateSwitch({ className }: { className?: string }) {
	const dispatch = useAppDispatch();
	const setIsLive = (isLive: boolean) => dispatch(setLiveUpdate(isLive));
	const isLive = useAppSelector(selectLiveUpdateState);

	return (
		<div
			className={className}
			style={{ display: "flex", alignItems: "center" }}
		>
			<label>Live updates:</label>
			<SliderSwitch
				value={isLive}
				onChange={() => setIsLive(!isLive)}
			/>
		</div>
	);
}

export default LiveUpdateSwitch;
