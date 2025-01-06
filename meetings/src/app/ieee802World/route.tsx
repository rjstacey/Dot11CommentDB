import { LoaderFunction, RouteObject } from "react-router";

import { store } from "@/store";
import { load802WorldSchedule } from "@/store/ieee802World";

import Ieee802World from "./Ieee802World";

const ieee802WorldLoader: LoaderFunction = async () => {
	store.dispatch(load802WorldSchedule());
	return null;
};

const route: RouteObject = {
	element: <Ieee802World />,
	loader: ieee802WorldLoader,
};

export default route;
