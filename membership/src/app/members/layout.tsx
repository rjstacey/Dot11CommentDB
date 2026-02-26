import { MembersActions } from "./actions";
import { MembersTable } from "./main";

export function MembersLayout() {
	return (
		<>
			<MembersActions />
			<MembersTable />
		</>
	);
}

export default MembersLayout;
