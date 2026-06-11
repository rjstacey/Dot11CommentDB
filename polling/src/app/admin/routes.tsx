import type { RouteObject } from "react-router";
import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { pollingAdminSelectEvent } from "@/store/pollingAdmin";
import EventsList from "./eventsList";
import EventPanel from "./eventPanel";

export const loader: LoaderFunction = async ({ params }) => {
	const { eventId } = params;
	if (!eventId) throw new Error("Route error: eventId not set");

	const { dispatch } = store;

	dispatch(pollingAdminSelectEvent(Number(eventId)));
};

const route: RouteObject = {
	children: [
		{
			index: true,
			element: <EventsList />,
		},
		{
			path: ":eventId",
			loader,
			element: <EventPanel />,
		},
	],
};

export default route;
