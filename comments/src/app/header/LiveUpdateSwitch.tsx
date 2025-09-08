import { FormCheck } from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectLiveUpdateState, setLiveUpdate } from "@/store/liveUpdate";

function LiveUpdateSwitch() {
	const dispatch = useAppDispatch();
	const setIsLive = (isLive: boolean) => dispatch(setLiveUpdate(isLive));
	const isLive = useAppSelector(selectLiveUpdateState);

	return (
		<FormCheck
			type="switch"
			checked={isLive}
			onChange={() => setIsLive(!isLive)}
			id="liveupdate"
			label="Live update"
			reverse
		/>
	);
}

export default LiveUpdateSwitch;
