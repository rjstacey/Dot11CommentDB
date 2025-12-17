import { Outlet } from "react-router";
import { CommentsActions } from "./actions";

export function CommentsLayout() {
	return (
		<>
			<CommentsActions />
			<Outlet />
		</>
	);
}
