import { RouteObject } from "react-router";
import { loader } from "../../members/loader";
import MembersReport from ".";

export const route: RouteObject = {
	Component: MembersReport,
	loader,
};
