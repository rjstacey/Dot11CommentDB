import React from "react";
import { Outlet, useBeforeUnload } from "react-router";
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

	useBeforeUnload(
		React.useCallback(() => {
			console.log("unload");
			dispatch(pollingSocketLeaveGroup());
			dispatch(pollingSocketDisconnect());
		}, [])
	);

	React.useEffect(() => {
		console.log("mount");
		dispatch(pollingSocketConnect());
		return () => {
			console.log("unmount");
			dispatch(pollingSocketLeaveGroup());
			dispatch(pollingSocketDisconnect());
		};
	}, [dispatch]);

	React.useEffect(() => {
		if (group) dispatch(pollingSocketJoinGroup(group.id));
		else dispatch(pollingSocketLeaveGroup());
	}, [dispatch, group]);

	return (
		<React.Suspense fallback={<span>Loading...</span>}>
			<Outlet />
		</React.Suspense>
	);
}

export default Polling;
