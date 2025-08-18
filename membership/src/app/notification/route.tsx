import { lazy } from "react";
import { RouteObject } from "react-router";
import { notificationLoader } from "./loader";

const Notification = lazy(() => import("."));

export const notificationRoute: RouteObject = {
	element: <Notification />,
	loader: notificationLoader,
};
