import { Outlet } from "react-router";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";
import ReportsActions from "./actions";

function ReportsLayout() {
	return (
		<>
			<div className="top-row">
				<ProjectBallotSelector />
				<ReportsActions />
			</div>
			<Outlet />
		</>
	);
}

export default ReportsLayout;
