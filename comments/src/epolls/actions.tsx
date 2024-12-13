import { Link } from "react-router-dom";

import { ActionButton, Button, Spinner } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import {
	loadMoreEpolls,
	refreshEpolls,
	selectEpollsState,
} from "../store/epolls";

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
			<span>
				<ActionButton
					name="more"
					title="Load More"
					onClick={() => dispatch(loadMoreEpolls())}
					disabled={loading || !isOnline}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={() => dispatch(refreshEpolls())}
					disabled={loading || !isOnline}
				/>
				<Link to="../ballots">
					<Button>
						<i className="bi-x" />
					</Button>
				</Link>
			</span>
		</div>
	);
}

export default EpollsActions;
