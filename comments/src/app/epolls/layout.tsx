import { EpollsActions } from "./actions";
import { EpollsMain } from "./main";

export function EpollsLayout() {
	return (
		<>
			<EpollsActions />
			<EpollsMain />
		</>
	);
}
