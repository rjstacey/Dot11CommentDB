import { Outlet } from "react-router";
import { ErrorModal, ConfirmModal } from "@common";
import Header from "./header";

export function AppLayout() {
	return (
		<>
			<Header />
			<main className="body">
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}
