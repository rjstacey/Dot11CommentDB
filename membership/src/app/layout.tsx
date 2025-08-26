import { Outlet } from "react-router";
import { ErrorModal, ConfirmModal } from "@components/modals";
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
			{/* @ts-expect-error */}
			<ConfirmModal />
		</>
	);
}
