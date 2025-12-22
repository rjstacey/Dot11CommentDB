import { Outlet } from "react-router";
import { ErrorModal, ConfirmModal } from "@common";
import Header from "./header";

import css from "./app.module.css";

export function AppLayout() {
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
