import { Button, ButtonGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";

function TableViewSelector({
	selectors,
	actions,
}: {
	selectors: AppTableDataSelectors<any>;
	actions: AppTableDataActions;
}) {
	const dispatch = useDispatch();

	const currentView = useSelector(selectors.selectCurrentView);
	const allViews = useSelector(selectors.selectViews);

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
