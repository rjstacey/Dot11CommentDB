import { createPortal } from "react-dom";
import { Outlet } from "react-router";
import CommentsActions from "./actions";

function CommentsLayout() {
	const actionsRef = document.querySelector("#actions");
	return (
		<>
			{actionsRef && createPortal(<CommentsActions />, actionsRef)}
			<Outlet />
		</>
	);
}

export default CommentsLayout;
