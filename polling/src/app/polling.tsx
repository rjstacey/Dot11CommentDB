import React from "react";
import { useSearchParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSelectedGroup } from "@/store/groups";
import {
	pollingSocketConnect,
	pollingSocketDisconnect,
	pollingSocketJoinGroup,
	pollingSocketLeaveGroup,
} from "@/store/pollingSocket";

import PollAdmin from "./admin";
import PollUser from "./user";

function Polling() {
	const [searchParams] = useSearchParams();
	const dispatch = useAppDispatch();

	const group = useAppSelector(selectSelectedGroup);

	React.useEffect(() => {
		dispatch(pollingSocketConnect());
		return () => {
			dispatch(pollingSocketDisconnect());
		};
	}, [dispatch]);

	React.useEffect(() => {
		if (group) dispatch(pollingSocketJoinGroup(group.id));
		else dispatch(pollingSocketLeaveGroup());
	}, [dispatch, group]);

	return searchParams.get("isAdmin") === "true" ? (
		<PollAdmin />
	) : (
		<PollUser />
	);
}

export default Polling;
