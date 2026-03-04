import { RouteObject } from "react-router";
import { loader } from "../members/loader";
import { AffiliationMapMain } from "./main";

export const affiliationMapRoute: RouteObject = {
	Component: AffiliationMapMain,
	loader,
};
