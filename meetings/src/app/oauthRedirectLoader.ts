import { redirect, type LoaderFunction } from "react-router";
import { store } from "@/store";
import { selectWebexAccountsGroupName } from "@/store/webexAccounts";
import { rootLoader } from "./rootLoader";

export const oauthRedirectLoader: LoaderFunction = async (args) => {
	await rootLoader(args);
	const { getState } = store;
	const groupName = selectWebexAccountsGroupName(getState());
	const path = groupName ? `/${groupName}/accounts` : "/";
	return redirect(path);
};
