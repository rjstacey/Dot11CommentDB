import { LoaderFunction, RouteObject } from "react-router";
import { EntityId, Dictionary } from "@reduxjs/toolkit";
import { store } from "@/store";
import {
	CalendarAccount,
	loadCalendarAccounts,
	selectCalendarAccountsState,
} from "@/store/calendarAccounts";

import Calendar from "./Calendar";

export type LoaderData = string | null;

function getPrimaryCalendarId(
	ids: EntityId[],
	entities: Dictionary<CalendarAccount>
) {
	for (const id of ids) {
		const account = entities[id]!;
		if (account.primaryCalendar) return account.primaryCalendar.id;
	}
	return null;
}

const calendarLoader: LoaderFunction<LoaderData> = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const { dispatch, getState } = store;
	const { valid, ids, entities } = selectCalendarAccountsState(getState());
	let primaryCalendarId = valid ? getPrimaryCalendarId(ids, entities) : null;
	if (!primaryCalendarId) {
		await dispatch(loadCalendarAccounts(groupName));
		const { ids, entities } = selectCalendarAccountsState(getState());
		primaryCalendarId = getPrimaryCalendarId(ids, entities);
	}
	return primaryCalendarId;
};

const route: RouteObject = {
	element: <Calendar />,
	loader: calendarLoader,
};

export default route;
