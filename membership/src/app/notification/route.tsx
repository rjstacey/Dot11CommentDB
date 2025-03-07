import { RouteObject } from "react-router";
import Notification from "./Notification";
import { notificationLoader } from "./loader";

export const notificationRoute: RouteObject = {
	element: <Notification />,
	loader: notificationLoader,
};
