import { RouteObject } from "react-router";
import { membersLoader } from "../members/loader";
import MembershipHistory from "./main";

export const membershipHistoryRoute: RouteObject = {
	Component: MembershipHistory,
	loader: membersLoader,
};
