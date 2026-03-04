import { RouteObject } from "react-router";
import { loader } from "./loader";
import { MembershipOverTimeMain } from "./main";

export const membershipOverTimeRoute: RouteObject = {
	Component: MembershipOverTimeMain,
	loader,
};
