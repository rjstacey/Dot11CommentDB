import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const NotificationMain = lazy(() => import("./main"));

export const notificationRoute: RouteObject = {
	hydrateFallbackElement: <div>Loading...</div>,
	Component: NotificationMain,
	loader,
};
