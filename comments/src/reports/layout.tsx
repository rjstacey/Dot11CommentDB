import { createPortal } from "react-dom";
import { Outlet } from "react-router";
import ReportsActions from "./actions";

function ReportsLayout() {
	const actionsRef = document.querySelector("#actions");
	return (
		<>
			{actionsRef && createPortal(<ReportsActions />, actionsRef)}
			<Outlet />
		</>
	);
}

export default ReportsLayout;
