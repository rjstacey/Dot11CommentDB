import { Outlet } from "react-router";
import ProjectBallotSelector from "../components/ProjectBallotSelector";
import CommentsActions from "./actions";

function CommentsLayout() {
	const actionsRef = document.querySelector("#actions");
	return (
		<>
			<div className="top-row">
				<ProjectBallotSelector />
				<CommentsActions />
			</div>
			<Outlet />
		</>
	);
}

export default CommentsLayout;
