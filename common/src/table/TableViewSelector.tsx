import { Button, ButtonGroup } from "react-bootstrap";

import {
	type AppTableDataSelectors,
	type AppTableDataActions,
	useAppTableDispatch,
	useAppTableSelector,
} from "../store/appTableData";

function TableViewSelector({
	selectors,
	actions,
}: {
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
}) {
	const dispatch = useAppTableDispatch();

	const currentView = useAppTableSelector(selectors.selectCurrentView);
	const allViews = useAppTableSelector(selectors.selectViews);

	if (allViews.length <= 1) return null;

	return (
		<ButtonGroup>
			{allViews.map((view) => (
				<Button
					variant="outline-secondary"
					key={view}
					active={currentView === view}
					onClick={() =>
						dispatch(actions.setTableView({ tableView: view }))
					}
				>
					{view}
				</Button>
			))}
		</ButtonGroup>
	);
}

export default TableViewSelector;
