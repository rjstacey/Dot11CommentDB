import { Outlet, Link } from "react-router";
import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import styles from "./app.module.css";

function Layout() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<Outlet />
			</main>
			<footer>
				<Link to="privacy-policy">Privacy policy</Link>
			</footer>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

export default Layout;
