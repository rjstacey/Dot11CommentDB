import React from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	pollingSocketConnect,
	pollingSocketDisconnect,
	pollingSocketJoinGroup,
	pollingSocketLeaveGroup,
} from "../store/pollingSocket";

import PollAdmin from "../admin";
import PollUser from "../user";
import { selectSelectedSubgroup } from "../store/groups";

function Polling() {
	const [searchParams] = useSearchParams();
	const dispatch = useAppDispatch();

	const group = useAppSelector(selectSelectedSubgroup);

	React.useEffect(() => {
		dispatch(pollingSocketConnect());
		return () => {
			dispatch(pollingSocketDisconnect());
		};
	}, [dispatch]);

	React.useEffect(() => {
		if (group) dispatch(pollingSocketJoinGroup(group.id));
		else dispatch(pollingSocketLeaveGroup());
	}, [group]);

	return searchParams.get("isAdmin") === "true" ? (
		<PollAdmin />
	) : (
		<PollUser />
	);
}

export default Polling;
