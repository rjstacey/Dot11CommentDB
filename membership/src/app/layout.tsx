import { Outlet } from "react-router";
import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import styles from "./app.module.css";

function AppLayout() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

export default AppLayout;
