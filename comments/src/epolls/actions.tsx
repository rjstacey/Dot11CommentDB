import React from "react";
import { useParams, Link } from "react-router-dom";

import { ActionButton, Button, Spinner } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import { loadEpolls, selectEpollsState } from "../store/epolls";

function EpollsActions() {
	const dispatch = useAppDispatch();
	const { groupName } = useParams();

	const { loading } = useAppSelector(selectEpollsState);
	const isOnline = useAppSelector(selectIsOnline);
	const numberEpolls = React.useRef(20);

	const load = React.useCallback(
		() =>
			groupName && dispatch(loadEpolls(groupName, numberEpolls.current)),
		[dispatch, groupName]
	);

	function loadMore() {
		numberEpolls.current += 10;
		load();
	}

	return (
		<div className="top-row">
			<span>
				<label>Closed ePolls</label>
			</span>
			{loading && <Spinner />}
			<span>
				<ActionButton
					name="more"
					title="Load More"
					onClick={loadMore}
					disabled={loading || !isOnline}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={load}
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
