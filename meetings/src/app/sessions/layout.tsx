import { SessionsActions } from "./actions";
import { SessionsMain } from "./main";

export function SessionsLayout() {
	return (
		<>
			<SessionsActions />
			<SessionsMain />
		</>
	);
}
