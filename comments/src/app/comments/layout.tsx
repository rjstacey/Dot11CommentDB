import { Outlet } from "react-router";
import CommentsActions from "./actions";

function CommentsLayout() {
	return (
		<>
			<CommentsActions />
			<Outlet />
		</>
	);
}

export default CommentsLayout;
