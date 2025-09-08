import { Spinner, Button } from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import {
	loadMoreEpolls,
	refreshEpolls,
	selectEpollsState,
} from "@/store/epolls";

import { BallotsSubmenu } from "../submenu";

function EpollsActions() {
	const dispatch = useAppDispatch();
	const { loading } = useAppSelector(selectEpollsState);
	const isOnline = useAppSelector(selectIsOnline);

	return (
		<div className="top-row">
			<span>
				<label>Closed ePolls</label>
			</span>
			<Spinner style={{ visibility: loading ? "visible" : "hidden" }} />
			<BallotsSubmenu />
			<span>
				<Button
					variant="outline-secondary"
					className="bi-chevron-double-down"
					title="Load More"
					onClick={() => dispatch(loadMoreEpolls())}
					disabled={loading || !isOnline}
				/>
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					name="refresh"
					title="Refresh"
					onClick={() => dispatch(refreshEpolls())}
					disabled={loading || !isOnline}
				/>
			</span>
		</div>
	);
}

export default EpollsActions;
