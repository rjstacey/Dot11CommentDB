import React from "react";
import { Outlet } from "react-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSelectedGroup } from "@/store/groups";
import {
	pollingSocketConnect,
	pollingSocketDisconnect,
	pollingSocketJoinGroup,
	pollingSocketLeaveGroup,
} from "@/store/pollingSocket";

function Polling() {
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

	return (
		<div style={{ width: "100%" }}>
			<Outlet />
		</div>
	);
}

export default Polling;
