import * as React from "react";
import { Container, Button, FormControl, FormCheck } from "react-bootstrap";
import { ConfirmModal } from "@common";
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
		<FormControl
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
			<Button variant="outline-secondary" href={account.authUrl}>
				{account.authDate ? "Reauthorize" : "Authorize"}
			</Button>
			{account.authDate && (
				<Button
					variant="outline-secondary"
					onClick={() => handleRevoke(account.id)}
				>
					{"Revoke"}
				</Button>
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
		<FormCheck
			id={`webex-account-${account.id}-use-by-default`}
			aria-label={`Webex account ${account.id} use by default`}
			checked={isDefault}
			onChange={toggleDefaultId}
		/>
	);
}

function Actions({ account }: CellProps) {
	const dispatch = useAppDispatch();
	async function handleDelete(id: number) {
		if (account.name) {
			const ok = await ConfirmModal.show(
				`Are you sure you want to delete the account "${account.name}"?`
			);
			if (!ok) return;
		}
		dispatch(deleteWebexAccount(id));
	}
	return (
		<button
			className="bi-trash icon action"
			onClick={() => handleDelete(account.id)}
		/>
	);
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
		styleCell: { gap: "0.5rem" },
		renderCell: (props: CellProps) => <AuthButtons {...props} />,
	},
	defaults: {
		label: "Use by default",
		styleCell: { justifyContent: "center" },
		renderCell: (props: CellProps) => <Defaults {...props} />,
	},
	actions: {
		label: "",
		renderCell(props: CellProps) {
			return <Actions {...props} />;
		},
	},
};

function WebexAccounts() {
	const dispatch = useAppDispatch();
	const handleAdd = () => dispatch(addWebexAccount(defaultAccount));
	const { loading } = useAppSelector(selectWebexAccountsState);
	const accounts = useAppSelector(selectWebexAccounts);
	const refresh = () => dispatch(refreshWebexAccounts());

	const colProps = React.useMemo(
		() => accounts.map((account) => ({ account, readOnly: false })),
		[accounts]
	);

	const columns = React.useMemo(() => {
		const keys = Object.keys(tableColumns);
		//if (readOnly) keys = keys.filter((key) => key !== "actions");

		const columns = keys.map((key) => {
			const col: TableColumn = {
				key,
				...tableColumns[key],
			};
			return col;
		});

		return columns;
	}, []);

	return (
		<Container fluid className="p-3">
			<div className="top-row">
				<h3>Webex accounts</h3>
				<div className="d-flex gap-2">
					<Button
						variant="light"
						className="bi-plus-lg"
						onClick={() => handleAdd()}
					>
						{" Add account"}
					</Button>
					<Button
						variant="outline-primary"
						className="bi-arrow-repeat"
						title="Refresh"
						onClick={refresh}
						disabled={loading}
					/>
				</div>
			</div>
			<Table values={colProps} columns={columns} />
		</Container>
	);
}

export default WebexAccounts;
