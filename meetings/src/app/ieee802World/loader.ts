import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { load802WorldSchedule } from "@/store/ieee802World";

export function refresh() {
	store.dispatch(load802WorldSchedule());
}

export const loader: LoaderFunction = async () => {
	store.dispatch(load802WorldSchedule());
	return null;
};
