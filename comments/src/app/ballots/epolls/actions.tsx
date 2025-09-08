import { Spinner, Button, Row, Col } from "react-bootstrap";

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
		<Row className="w-100 d-flex justify-content-end align-items-center m-2">
			<BallotsSubmenu />
			<Spinner style={{ visibility: loading ? "visible" : "hidden" }} />
			<Col xs="auto" className="d-flex justify-content-end gap-2">
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
			</Col>
		</Row>
	);
}

export default EpollsActions;
