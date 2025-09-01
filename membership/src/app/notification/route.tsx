import { RouteObject } from "react-router";
import { loader } from "./loader";
import Notification from "./main";

export const notificationRoute: RouteObject = {
	Component: Notification,
	loader,
};
