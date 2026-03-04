import { RouteObject } from "react-router";
import { membersLoader } from "../../members/loader";
import MembersReport from ".";

export const route: RouteObject = {
	loader: membersLoader,
	element: <MembersReport />,
};
