import ProjectBallotSelector from "../components/ProjectBallotSelector";
import ResultsActions from "./actions";
import ResultsTable from "./table";

function ResultsLayout() {
	return (
		<>
			<div className="top-row">
				<ProjectBallotSelector />
				<ResultsActions />
			</div>
			<ResultsTable />
		</>
	);
}

export default ResultsLayout;
