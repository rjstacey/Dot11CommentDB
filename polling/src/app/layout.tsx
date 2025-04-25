import { Outlet } from "react-router";
import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";

import css from "./app.module.css";

function AppLayout() {
	return (
		<>
			<Header />
			<main className={css.body}>
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

export default AppLayout;
