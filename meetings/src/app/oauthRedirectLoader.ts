import { redirect, type LoaderFunction } from "react-router";
import { store } from "@/store";
import { selectWebexAccountsGroupName } from "@/store/webexAccounts";

export const oauthRedirectLoader: LoaderFunction = async () => {
	const { getState } = store;
	const groupName = selectWebexAccountsGroupName(getState());
	const path = groupName ? `/${groupName}/accounts` : "/";
	return redirect(path);
};
