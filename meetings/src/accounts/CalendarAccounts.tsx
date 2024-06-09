import * as React from "react";

import {
	Button,
	ActionButton,
	Input,
	ActionIcon,
	Checkbox,
} from "dot11-components";

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
import {
	selectCurrentGroupDefaults,
	updateCurrentGroupDefaults,
	GroupDefaults,
} from "../store/current";

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

type CellProps = {
	account: CalendarAccount;
	readOnly: boolean;
};

function AccountName({ account, readOnly }: CellProps) {
	const dispatch = useAppDispatch();
	const handleChange = (id: number, changes: Partial<CalendarAccount>) =>
		dispatch(updateCalendarAccount(id, changes));
	return (
		<Input
			type="search"
			value={account.name}
			onChange={(e) => handleChange(account.id, { name: e.target.value })}
			readOnly={readOnly}
		/>
	);
}

function AuthorizedBy({ account }: CellProps) {
	const memberEntities = useAppSelector(selectMemberEntities);

	let s: string;
	if (!account.authUserId) {
		s = "-";
	} else {
		const m = memberEntities[account.authUserId];
		s = m ? m.Name : "SAPIN: " + account.authUserId;
	}
	return <span>{s}</span>;
}

function AuthButtons({ account }: CellProps) {
	const dispatch = useAppDispatch();
	const handleRevoke = (id: number) =>
		dispatch(revokeAuthCalendarAccount(id));

	if (!account.authUrl) return null;
	return (
		<>
			<Button
				style={{ marginLeft: "1em" }}
				onClick={() => (window.location.href = account.authUrl!)}
			>
				{account.authDate ? "Reauthorize" : "Authorize"}
			</Button>
			<Button
				style={{ marginLeft: "1em" }}
				onClick={() => handleRevoke(account.id)}
			>
				{"Revoke"}
			</Button>
		</>
	);
}

function Defaults({ account }: CellProps) {
	const dispatch = useAppDispatch();
	const defaults = useAppSelector(selectCurrentGroupDefaults);
	const doUpdate = (changes: Partial<GroupDefaults>) =>
		dispatch(updateCurrentGroupDefaults(changes));
	const isDefault = account.id === defaults.calendarAccountId;
	return (
		<Checkbox
			checked={isDefault}
			onChange={(e) =>
				doUpdate({
					calendarAccountId: e.target.checked ? account.id : 0,
				})
			}
		/>
	);
}

function Actions({ account }: CellProps) {
	const dispatch = useAppDispatch();
	const handleDelete = (id: number) => dispatch(deleteCalendarAccount(id));
	return (
		<ActionIcon type="delete" onClick={() => handleDelete(account.id)} />
	);
}

function ActionsHeader() {
	const dispatch = useAppDispatch();
	const handleAdd = () => dispatch(addCalendarAccount(defaultAccount));
	return <ActionIcon type="add" onClick={() => handleAdd()} />;
}

const tableColumns: { [key: string]: Omit<TableColumn, "key"> } = {
	name: {
		label: "Name",
		renderCell: (props: CellProps) => <AccountName {...props} />,
	},
	ownerInfo: {
		label: "Owner",
		renderCell({ account }: CellProps) {
			return (
				(account.displayName || "-") +
				(account.userName ? ` (${account.userName})` : "")
			);
		},
	},
	authorizedBy: {
		label: "Authorized by",
		renderCell: (props: CellProps) => <AuthorizedBy {...props} />,
	},
	authorized: {
		label: "Last authorized",
		renderCell({ account }: CellProps) {
			return account.authDate ? displayDate(account.authDate) : "-";
		},
	},
	accessed: {
		label: "Last accessed",
		renderCell({ account }: CellProps) {
			return account.lastAccessed
				? displayDate(account.lastAccessed)
				: "-";
		},
	},
	authButtons: {
		label: "Authorize",
		renderCell: (props: CellProps) => <AuthButtons {...props} />,
	},
	defaults: {
		label: "Use by default",
		renderCell: (props: CellProps) => <Defaults {...props} />,
	},
	actions: {
		gridTemplate: "40px",
		label: <ActionsHeader />,
		renderCell: (props: CellProps) => <Actions {...props} />,
	},
};

function CalendarAccounts() {
	const dispatch = useAppDispatch();
	const { loading } = useAppSelector(selectCalendarAccountsState);
	const accounts = useAppSelector(selectCalendarAccounts);

	const [readOnly, setReadOnly] = React.useState(true);
	const refresh = () => dispatch(refreshCalendarAccounts());

	const colProps = React.useMemo(
		() => accounts.map((account) => ({ account, readOnly })),
		[accounts, readOnly]
	);

	const columns = React.useMemo(() => {
		let keys = Object.keys(tableColumns);
		if (readOnly) keys = keys.filter((key) => key !== "actions");

		const columns = keys.map((key) => {
			const col: TableColumn = {
				key,
				...tableColumns[key],
			};

			return col;
		});

		return columns;
	}, [readOnly]);

	return (
		<>
			<div className="top-row">
				<h3>Google calendar accounts</h3>
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
			<Table values={colProps} columns={columns} />
		</>
	);
}

export default CalendarAccounts;
