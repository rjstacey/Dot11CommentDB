import { ImatMeetingsActions } from "./actions";
import { ImatMeetingsMain } from "./main";

export function ImatMeetingsLayout() {
	return (
		<>
			<ImatMeetingsActions />
			<ImatMeetingsMain />
		</>
	);
}
