import SessionsActions from "./actions";
import SessionsTable from "./table";

function SessionsLayout() {
	return (
		<>
			<div className="top-row justify-right">
				<SessionsActions />
			</div>
			<SessionsTable />
		</>
	);
}

export default SessionsLayout;
