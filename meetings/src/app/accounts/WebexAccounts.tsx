import * as React from "react";

import { ActionButton, Input, ActionIcon, Checkbox } from "dot11-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectMemberEntities } from "@/store/members";
import {
	refreshWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	revokeAuthWebexAccount,
	setWebexAccountDefaultId,
	selectWebexAccountsState,
	selectWebexAccountDefaultId,
	selectWebexAccounts,
	WebexAccount,
	WebexAccountCreate,
} from "@/store/webexAccounts";

import { EditTable as Table, TableColumn } from "@/components/Table";

import styles from "./accounts.module.css";

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
};

type CellProps = {
	account: WebexAccount;
	readOnly: boolean;
};

function AccountName({ account, readOnly }: CellProps) {
	const dispatch = useAppDispatch();
	const handleChange = (id: number, changes: Partial<WebexAccount>) =>
		dispatch(updateWebexAccount(id, changes));
	return (
		<Input
			id={`webex-account-${account.id}-name`}
			aria-label={`Webex account ${account.id} name`}
			type="search"
			value={account.name}
			onChange={(e) => handleChange(account.id, { name: e.target.value })}
			readOnly={readOnly}
			autoComplete="none"
		/>
	);
}

function AuthorizedBy({ account }: { account: WebexAccount }) {
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
	const handleRevoke = (id: number) => dispatch(revokeAuthWebexAccount(id));
	if (!account.authUrl) return null;
	return (
		<>
			<a
				style={{ marginLeft: "1em" }}
				className={styles.button}
				href={account.authUrl}
			>
				{account.authDate ? "Reauthorize" : "Authorize"}
			</a>
			{account.authDate && (
				<button
					style={{ marginLeft: "1em" }}
					className={styles.button}
					onClick={() => handleRevoke(account.id)}
				>
					{"Revoke"}
				</button>
			)}
		</>
	);
}

function Defaults({ account }: CellProps) {
	const dispatch = useAppDispatch();
	const defaultId = useAppSelector(selectWebexAccountDefaultId);
	const isDefault = account.id === defaultId;
	const toggleDefaultId = () =>
		dispatch(setWebexAccountDefaultId(isDefault ? null : account.id));
	return (
		<Checkbox
			id={`webex-account-${account.id}-use-by-default`}
			aria-label={`Webex account ${account.id} use by default`}
			checked={isDefault}
			onChange={toggleDefaultId}
		/>
	);
}

function Actions({ account }: CellProps) {
	const dispatch = useAppDispatch();
	const handleDelete = (id: number) => dispatch(deleteWebexAccount(id));
	return (
		<ActionIcon type="delete" onClick={() => handleDelete(account.id)} />
	);
}

function ActionsHeader() {
	const dispatch = useAppDispatch();
	const handleAdd = () => dispatch(addWebexAccount(defaultAccount));
	return <ActionIcon type="add" onClick={() => handleAdd()} />;
}

const tableColumns: { [key: string]: Omit<TableColumn, "key"> } = {
	name: {
		label: "Name",
		renderCell(props: CellProps) {
			return <AccountName {...props} />;
		},
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
		renderCell({ account }: CellProps) {
			return <AuthorizedBy account={account} />;
		},
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
		renderCell(props: CellProps) {
			return <Actions {...props} />;
		},
	},
};

function WebexAccounts() {
	const dispatch = useAppDispatch();
	const { loading } = useAppSelector(selectWebexAccountsState);
	const accounts = useAppSelector(selectWebexAccounts);
	const [readOnly, setReadOnly] = React.useState(true);
	const refresh = () => dispatch(refreshWebexAccounts());

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
			<Table values={colProps} columns={columns} />
		</>
	);
}

export default WebexAccounts;
