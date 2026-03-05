import { RouteObject } from "react-router";
import { loader } from "../../membershipOverTime/loader";
import MembershipOverTimeReport from ".";

export const route: RouteObject = {
	Component: MembershipOverTimeReport,
	loader,
};
