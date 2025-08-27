import { Outlet } from "react-router";
import { Container } from "react-bootstrap";

import { Menu } from "./menu";

export function Reports() {
	return (
		<Container fluid className="d-flex flex-grow-1 w-100">
			<Menu />
			<Container fluid className="d-flex flex-column p-3">
				<Outlet />
			</Container>
		</Container>
	);
}

export default Reports;
