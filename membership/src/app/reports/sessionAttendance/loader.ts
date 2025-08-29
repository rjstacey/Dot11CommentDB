import { LoaderFunction } from "react-router";
import { store } from "@/store";
import { loadAffiliationMap } from "@/store/affiliationMap";
import { sessionAttendanceLoader } from "../../sessionAttendance/loader";

export const loader: LoaderFunction = async (args) => {
	sessionAttendanceLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch } = store;
	dispatch(loadAffiliationMap(groupName));
};
