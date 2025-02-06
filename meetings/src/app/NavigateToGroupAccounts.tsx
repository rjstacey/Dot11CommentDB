import { Navigate } from "react-router";
import { useAppSelector } from "../store/hooks";
import { selectWebexAccountsGroupName } from "@/store/webexAccounts";

export function NavigateToGroupAccounts() {
	const groupName = useAppSelector(selectWebexAccountsGroupName);
	const path = groupName ? `/${groupName}/accounts` : "/";
	return <Navigate to={path} />;
}
