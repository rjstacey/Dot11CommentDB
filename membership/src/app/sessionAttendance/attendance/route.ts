import { RouteObject } from "react-router";
import { loader } from "./loader";
import { SessionAttendanceTable } from ".";

const route: RouteObject = {
	loader,
	Component: SessionAttendanceTable,
};

export default route;
