import React from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch } from "../store/hooks";
import {
	pollingSocketConnect,
	pollingSocketDisconnect,
} from "../store/pollingSocket";

import PollAdmin from "../admin";
import PollUser from "../user";

function Polling() {
	const [searchParams] = useSearchParams();
	const dispatch = useAppDispatch();

	React.useEffect(() => {
		dispatch(pollingSocketConnect());
		return () => {
			dispatch(pollingSocketDisconnect());
		};
	}, [dispatch]);

	return searchParams.get("isAdmin") === "true" ? (
		<PollAdmin />
	) : (
		<PollUser />
	);
}

export default Polling;
