import { MembersActions } from "./actions";
import { MembersMain } from "./main";

export function MembersLayout() {
	return (
		<>
			<MembersActions />
			<MembersMain />
		</>
	);
}
