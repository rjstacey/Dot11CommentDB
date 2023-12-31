import React from "react";

import { Button, ActionButton, Input, ActionIcon } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	refreshCalendarAccounts,
	updateCalendarAccount,
	addCalendarAccount,
	deleteCalendarAccount,
	revokeAuthCalendarAccount,
	selectCalendarAccountsState,
	selectCalendarAccounts,
	CalendarAccountCreate,
	CalendarAccount,
} from "../store/calendarAccounts";
import { selectMemberEntities } from "../store/members";

import TopRow from "../components/TopRow";
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

const defaultAccount: CalendarAccountCreate = {
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
		gridTemplate: "minmax(200px, auto)",
	},
	authorizedBy: {
		label: "Authorized by",
		gridTemplate: "auto",
	},
	authorized: {
		label: "Last authorized",
		gridTemplate: "auto",
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

function CalendarAccounts() {
	const dispatch = useAppDispatch();
	const { loading } = useAppSelector(selectCalendarAccountsState);
	const accounts = useAppSelector(selectCalendarAccounts);

	const memberEntities = useAppSelector(selectMemberEntities);
	const [readOnly, setReadOnly] = React.useState(true);
	const refresh = () => dispatch(refreshCalendarAccounts());

	const columns = React.useMemo(() => {
		let keys = Object.keys(tableColumns);
		if (readOnly) keys = keys.filter((key) => key !== "actions");

		const handleAdd = () => dispatch(addCalendarAccount(defaultAccount));
		const handleDelete = (id: number) =>
			dispatch(deleteCalendarAccount(id));
		const handleChange = (id: number, changes: Partial<CalendarAccount>) =>
			dispatch(updateCalendarAccount(id, changes));
		const handleRevoke = (id: number) =>
			dispatch(revokeAuthCalendarAccount(id));

		const columns = keys.map((key) => {
			const col: TableColumn = {
				key,
				...tableColumns[key],
			};
			if (key === "name") {
				col.renderCell = (account: CalendarAccount) => (
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
				col.renderCell = (account: CalendarAccount) =>
					(account.displayName || "-") +
					(account.userName ? ` (${account.userName})` : "");
			} else if (key === "authorizedBy") {
				col.renderCell = (account: CalendarAccount) => {
					if (!account.authUserId) return "-";
					const m = memberEntities[account.authUserId];
					if (m) return m.Name;
					return "SAPIN: " + account.authUserId;
				};
			} else if (key === "authorized") {
				col.renderCell = (account: CalendarAccount) =>
					account.authDate ? displayDate(account.authDate) : "-";
			} else if (key === "authButtons") {
				col.renderCell = (account: CalendarAccount) => (
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
						{account.authDate && (
							<Button
								style={{ marginLeft: "1em" }}
								onClick={() => handleRevoke(account.id)}
							>
								{"Revoke"}
							</Button>
						)}
					</>
				);
			} else if (key === "actions") {
				col.renderCell = (account: CalendarAccount) => (
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
	}, [dispatch, readOnly, memberEntities]);

	return (
		<>
			<TopRow>
				<h3>Calendar accounts</h3>
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
			</TopRow>
			<Table values={accounts} columns={columns} />
		</>
	);
}

export default CalendarAccounts;
