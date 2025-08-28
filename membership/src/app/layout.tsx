import { Outlet } from "react-router";
import { ErrorModal, ConfirmModal } from "@components/modals";
import Header from "./header";

export function AppLayout() {
	return (
		<>
			<Header />
			<main className="main">
				<Outlet />
			</main>
			<ErrorModal />
			{/* @ts-expect-error */}
			<ConfirmModal />
		</>
	);
}
