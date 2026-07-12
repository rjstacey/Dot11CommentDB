import { Outlet, Link } from "react-router";
import { Container } from "react-bootstrap";
import { ErrorModal, ConfirmModal } from "@common";
import Header from "./Header";

function Layout() {
	return (
		<>
			<Header />
			<Container as="main" className="p-0">
				<Outlet />
			</Container>
			<Container as="footer" className="d-flex justify-content-around">
				<Link
					to="https://www.ieee.org/about/help/site-terms-conditions"
					replace
				>
					Terms of Service
				</Link>
				<Link to="privacy">Privacy Policy</Link>
			</Container>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

export default Layout;
