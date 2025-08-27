import { Outlet } from "react-router";
import { Container } from "react-bootstrap";
import { MembersActions } from "./actions";

export function MembersLayout() {
	return (
		<Container fluid className="d-flex flex-wrap h-100 w-100">
			<MembersActions />
			<Outlet />
		</Container>
	);
}

export default MembersLayout;
