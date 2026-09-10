import { RouteObject } from "react-router";
import { loader } from "./loader";
import NotificationMain from "./main-lazy";

export const notificationRoute: RouteObject = {
	hydrateFallbackElement: <div>Loading...</div>,
	Component: NotificationMain,
	loader,
};
