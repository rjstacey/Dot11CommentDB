import React from "react";

import { Button, ActionButton, Input, ActionIcon } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectMemberEntities } from "../store/members";
import {
	refreshWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	selectWebexAccountsState,
	selectWebexAccounts,
	WebexAccount,
	WebexAccountCreate,
} from "../store/webexAccounts";

import { EditTable as Table, TableColumn } from "../components/Table";

const displayDate = (d: string) =>
	new Intl.DateTimeFormat("default", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
	}).format(new Date(d));

const defaultAccount: WebexAccountCreate = {
	name: "",
	groups: [],
};

const tableColumns: { [key: string]: Omit<TableColumn, "key"> } = {
	name: {
		label: "Name",
		gridTemplate: "minmax(200px, auto)",
	},
	ownerInfo: {
		label: "Owner",
		gridTemplate: "auto",
	},
	authorizedBy: {
		label: "Authorized by",
		gridTemplate: "auto",
	},
	authorized: {
		label: "Last authorized",
		gridTemplate: "minmax(300px, 1fr)",
	},
	authButtons: {
		label: "",
		gridTemplate: "auto",
	},
	actions: {
		label: "",
		gridTemplate: "40px",
	},
};

function WebexAccounts() {
	const dispatch = useAppDispatch();
	const { loading } = useAppSelector(selectWebexAccountsState);
	const accounts = useAppSelector(selectWebexAccounts);
	const memberEntities = useAppSelector(selectMemberEntities);
	const [readOnly, setReadOnly] = React.useState(true);
	const refresh = () => dispatch(refreshWebexAccounts());

	const columns = React.useMemo(() => {
		let keys = Object.keys(tableColumns);
		if (readOnly) keys = keys.filter((key) => key !== "actions");

		const handleAdd = () => dispatch(addWebexAccount(defaultAccount));
		const handleDelete = (id: number) => dispatch(deleteWebexAccount(id));
		const handleChange = (id: number, changes: Partial<WebexAccount>) =>
			dispatch(updateWebexAccount(id, changes));

		const columns = keys.map((key) => {
			const col: TableColumn = {
				key,
				...tableColumns[key],
			};
			if (key === "name") {
				col.renderCell = (account: WebexAccount) => (
					<Input
						type="search"
						value={account.name}
						onChange={(e) =>
							handleChange(account.id, { name: e.target.value })
						}
						readOnly={readOnly}
					/>
				);
			} else if (key === "ownerInfo") {
				col.renderCell = (account: WebexAccount) =>
					(account.displayName || "-") +
					(account.userName ? ` (${account.userName})` : "");
			} else if (key === "authorizedBy") {
				col.renderCell = (account: WebexAccount) => {
					if (!account.authUserId) return "-";
					const m = memberEntities[account.authUserId];
					if (m) return m.Name;
					return "SAPIN: " + account.authUserId;
				};
			} else if (key === "authorized") {
				col.renderCell = (account: WebexAccount) =>
					account.authDate ? displayDate(account.authDate) : "-";
			} else if (key === "authButtons") {
				col.renderCell = (account: WebexAccount) => (
					<>
						{account.authUrl && (
							<Button
								style={{ marginLeft: "1em" }}
								onClick={() =>
									(window.location.href = account.authUrl!)
								}
							>
								{account.authDate ? "Reauthorize" : "Authorize"}
							</Button>
						)}
					</>
				);
			} else if (key === "actions") {
				col.renderCell = (account: WebexAccount) => (
					<ActionIcon
						type="delete"
						onClick={() => handleDelete(account.id)}
					/>
				);
				col.label = <ActionIcon type="add" onClick={handleAdd} />;
			}
			return col;
		});

		return columns;
	}, [dispatch, memberEntities, readOnly]);

	return (
		<>
			<div className="top-row">
				<h3>Webex accounts</h3>
				<div style={{ display: "flex" }}>
					<ActionButton
						name="edit"
						title="Edit"
						isActive={!readOnly}
						onClick={() => setReadOnly(!readOnly)}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
						disabled={loading}
					/>
				</div>
			</div>
			<Table values={accounts} columns={columns} />
		</>
	);
}

export default WebexAccounts;
