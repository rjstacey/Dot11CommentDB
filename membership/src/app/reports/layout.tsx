import { Outlet } from "react-router";
import { Container } from "react-bootstrap";

import { Menu } from "./menu";

export function Reports() {
	return (
		<Container fluid className="d-flex flex-grow-1 w-100 overflow-hidden">
			<Menu />
			<Container fluid className="d-flex flex-column p-3 overflow-hidden">
				<Outlet />
			</Container>
		</Container>
	);
}

export default Reports;
