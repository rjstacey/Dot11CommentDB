import { Outlet } from "react-router";
import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import css from "./app.module.css";

export function AppLayout() {
	return (
		<>
			<Header />
			<main className={css.main}>
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}
