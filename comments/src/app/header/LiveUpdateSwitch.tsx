import { FormCheck, FormLabel } from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectLiveUpdateState, setLiveUpdate } from "@/store/liveUpdate";

export function LiveUpdateSwitch() {
	const dispatch = useAppDispatch();
	const setIsLive = (isLive: boolean) => dispatch(setLiveUpdate(isLive));
	const isLive = useAppSelector(selectLiveUpdateState);

	return (
		<div className="d-flex flex-column align-items-center">
			<FormCheck
				type="switch"
				checked={isLive}
				onChange={() => setIsLive(!isLive)}
				id="liveupdate"
			/>
			<FormLabel htmlFor="liveupdate" className="fw-normal">
				{"Live update"}
			</FormLabel>
		</div>
	);
}
