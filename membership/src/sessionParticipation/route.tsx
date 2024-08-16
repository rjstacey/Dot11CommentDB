import { LoaderFunction } from "react-router-dom";
import { store } from "../store";
import { loadAttendances } from "../store/sessionParticipation";
import SessionParticipationLayout from "./layout";

const sessionParticipationLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadAttendances(groupName));
	}
	return null;
};

const route = {
	element: <SessionParticipationLayout />,
	loader: sessionParticipationLoader,
};

export default route;
