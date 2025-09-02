import { Outlet, Link } from "react-router";
import { Container } from "react-bootstrap";
import { ErrorModal, ConfirmModal } from "@components/modals";
import Header from "./Header";

function Layout() {
	return (
		<>
			<Header />
			<Container as="main" className="p-0">
				<Outlet />
			</Container>
			<Container as="footer" className="d-flex justify-content-center">
				<Link to="privacy-policy">Privacy policy</Link>
			</Container>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

export default Layout;
