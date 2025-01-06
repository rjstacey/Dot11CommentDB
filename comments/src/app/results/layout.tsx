import { Outlet } from "react-router";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";
import ResultsActions from "./actions";

function ResultsLayout() {
	return (
		<>
			<div className="top-row">
				<ProjectBallotSelector />
				<ResultsActions />
			</div>
			<Outlet />
		</>
	);
}

export default ResultsLayout;
