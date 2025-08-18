import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const Notification = lazy(() => import("."));

export const notificationRoute: RouteObject = {
	element: <Notification />,
	loader,
};
