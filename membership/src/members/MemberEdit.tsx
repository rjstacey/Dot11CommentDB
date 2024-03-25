import * as React from "react";
import { DateTime } from "luxon";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

import {
	Form,
	Row,
	Col,
	Field,
	FieldLeft,
	Checkbox,
	Input,
	ConfirmModal,
	isMultiple,
	shallowDiff,
	type Multiple,
	deepMerge,
	deepDiff,
} from "dot11-components";

import type { AppThunk } from "../store";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import {
	addMembers,
	updateMembers,
	deleteMembers,
	addMemberStatusChangeEntries,
	updateMemberStatusChangeEntries,
	deleteMemberStatusChangeEntries,
	setUiProperties,
	selectUiProperties,
	selectMemberEntities,
	selectMemberWithParticipationSummary,
	type Member,
	type MemberAdd,
} from "../store/members";

import UserSelector from "./UserSelector";
import StatusSelector from "./StatusSelector";
import MemberSelector from "./MemberAllSelector";
import MemberStatusChangeHistory from "./MemberStatusChange";
import MemberContactInfo from "./MemberContactInfo";
import MemberAttendances from "../sessionParticipation/MemberAttendances";
import MemberBallotParticipation from "../ballotParticipation/MemberBallotParticipation";
import { selectUserEntities } from "../store/users";

export type MultipleMember = Multiple<
	Omit<MemberAdd, "StatusChangeHistory" | "ContactEmails" | "ContactInfo">
> & {
	StatusChangeHistory: Member["StatusChangeHistory"];
	ContactEmails: Member["ContactEmails"];
	ContactInfo: Multiple<Member["ContactInfo"]>;
};

export type EditAction = "view" | "update" | "add";

export function hasChangesStyle<O extends object>(
	edited: O,
	saved: O | undefined,
	dataKey: keyof O
) {
	return saved && edited[dataKey] !== saved[dataKey]
		? { backgroundColor: "yellow" }
		: undefined;
}

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

const displayDate = (isoDateTime: string) =>
	DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function ShortMemberSummary({ sapins }: { sapins: number[] }) {
	const members = useAppSelector(selectMemberEntities);

	const rows = sapins.map((sapin) => {
		const m = members[sapin];
		if (!m) return null;
		return (
			<tr key={m.SAPIN}>
				<td>{m.SAPIN}</td>
				<td>{m.Name}</td>
				<td>{m.Email}</td>
				<td>{m.Affiliation}</td>
				<td>{m.Status}</td>
				<td>{displayDate(m.DateAdded)}</td>
			</tr>
		);
	});
	return (
		<table>
			<tbody>{rows}</tbody>
		</table>
	);
}

const renderDate = (value: any) =>
	isMultiple(value) ? (
		<i>{MULTIPLE_STR}</i>
	) : value ? (
		displayDate(value)
	) : (
		<i>{BLANK_STR}</i>
	);

function MemberDetailInfo({
	sapin,
	member,
	saved,
	updateMember,
	readOnly,
}: {
	sapin: number;
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const tabIndex: number = useAppSelector(selectUiProperties).tabIndex || 0;
	const setTabIndex = (tabIndex: number) => {
		dispatch(setUiProperties({ tabIndex }));
	};

	const memberEntitiesWithParticipation = useAppSelector(
		selectMemberWithParticipationSummary
	);
	const memberWithParticipation = memberEntitiesWithParticipation[sapin];
	const sessionSumary = memberWithParticipation?.AttendancesSummary || "";
	const ballotSummary =
		memberWithParticipation?.BallotParticipationSummary || "";

	return (
		<Tabs
			style={{ width: "100%" }}
			onSelect={setTabIndex}
			selectedIndex={tabIndex}
		>
			<TabList>
				<Tab>Contact info</Tab>
				<Tab>Status history</Tab>
				<Tab>{`Session participation ${sessionSumary}`}</Tab>
				<Tab>{`Ballot participation ${ballotSummary}`}</Tab>
			</TabList>
			<TabPanel>
				<MemberContactInfo
					edited={member}
					saved={saved}
					onChange={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberStatusChangeHistory
					member={member}
					saved={saved}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberAttendances SAPIN={sapin} readOnly={readOnly} />
			</TabPanel>
			<TabPanel>
				<MemberBallotParticipation SAPIN={sapin} readOnly={readOnly} />
			</TabPanel>
		</Tabs>
	);
}

function ExpandingInput({
	dataKey,
	member,
	saved,
	updateMember,
	...props
}: {
	dataKey: keyof MultipleMember;
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
} & React.ComponentProps<typeof Input>) {
	const value: any = member[dataKey] || "";
	return (
		<Input
			{...props}
			type="text"
			style={{
				...hasChangesStyle(member, saved, "Name"),
				width: `${Math.max(value.length, 20) + 2}ch`,
			}}
			name={dataKey}
			value={isMultiple(value) ? "" : value}
			onChange={(e) => updateMember({ [dataKey]: e.target.value })}
			placeholder={isMultiple(value) ? MULTIPLE_STR : BLANK_STR}
		/>
	);
}

function MemberBasicInfo({
	sapins,
	member,
	saved,
	updateMember,
	readOnly,
}: {
	sapins: number[];
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const hasMany = sapins.length > 1;
	const sapinsStr = sapins.join(", ");
	const sapinsLabel = hasMany ? "SA PINs:" : "SA PIN:";

	let statusChangeDate = "";
	if (!isMultiple(member.StatusChangeDate) && member.StatusChangeDate)
		statusChangeDate =
			DateTime.fromISO(member.StatusChangeDate).toISODate() || "";

	return (
		<>
			<Row>
				<FieldLeft label={sapinsLabel}>{sapinsStr}</FieldLeft>
				<FieldLeft label="Date added:">
					{renderDate(member.DateAdded)}
				</FieldLeft>
			</Row>
			<Row>
				<Field label="Name:">
					<ExpandingInput
						dataKey="Name"
						member={member}
						saved={saved}
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Email:">
					<ExpandingInput
						dataKey="Email"
						member={member}
						saved={saved}
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Employer:">
					<ExpandingInput
						dataKey="Employer"
						member={member}
						saved={saved}
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Affiliation:">
					<ExpandingInput
						dataKey="Affiliation"
						member={member}
						saved={saved}
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Status:">
					<StatusSelector
						style={{
							flexBasis: 200,
							...hasChangesStyle(member, saved, "Status"),
						}}
						value={isMultiple(member.Status) ? "" : member.Status}
						onChange={(value) => updateMember({ Status: value })}
						placeholder={
							isMultiple(member.Status) ? MULTIPLE_STR : BLANK_STR
						}
						readOnly={readOnly}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<label>Override</label>
						<Checkbox
							style={hasChangesStyle(
								member,
								saved,
								"StatusChangeOverride"
							)}
							checked={Boolean(member.StatusChangeOverride)}
							indeterminate={isMultiple(
								member.StatusChangeOverride
							)}
							onChange={(
								e: React.ChangeEvent<HTMLInputElement>
							) =>
								updateMember({
									StatusChangeOverride: e.target.checked,
								})
							}
							disabled={readOnly}
						/>
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<label>Last change</label>
						<Input
							type="date"
							style={hasChangesStyle(
								member,
								saved,
								"StatusChangeDate"
							)}
							value={statusChangeDate}
							onChange={(e) =>
								updateMember({
									StatusChangeDate: e.target.value,
								})
							}
							placeholder={
								isMultiple(member.StatusChangeDate)
									? MULTIPLE_STR
									: undefined
							}
						/>
					</div>
				</Field>
			</Row>
			{member.Status === "Obsolete" && (
				<Row>
					<Field label="Replaced by:">
						<MemberSelector
							style={{ maxWidth: 400, flex: 1 }}
							value={
								isMultiple(member.ReplacedBySAPIN)
									? null
									: member.ReplacedBySAPIN || null
							}
							onChange={(value) =>
								updateMember({ ReplacedBySAPIN: value })
							}
							placeholder={
								isMultiple(member.ReplacedBySAPIN)
									? MULTIPLE_STR
									: BLANK_STR
							}
							readOnly={readOnly}
						/>
					</Field>
				</Row>
			)}
			{!hasMany && (
				<>
					{member.ObsoleteSAPINs &&
						!isMultiple(member.ObsoleteSAPINs) &&
						member.ObsoleteSAPINs.length > 0 && (
							<Row>
								<Col>
									<label>Replaces:</label>
									<ShortMemberSummary
										sapins={member.ObsoleteSAPINs}
									/>
								</Col>
							</Row>
						)}
				</>
			)}
		</>
	);
}

export function MemberEntryForm({
	action,
	sapins,
	member,
	saved,
	updateMember,
	add,
	update,
	cancel,
	readOnly,
	basicOnly,
}: {
	add: () => void;
	update: () => void;
	cancel: () => void;
	action: EditAction;
	sapins: number[];
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
	basicOnly?: boolean;
}) {
	const userEntities = useAppSelector(selectUserEntities);

	let errMsg = "";
	if (!member.SAPIN) errMsg = "SA PIN not set";
	else if (!member.Name) errMsg = "Name not set";

	let submitForm, cancelForm, submitLabel;
	if (action === "add") {
		submitLabel = "Add";
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg);
				return;
			}
			add();
		};
		cancelForm = cancel;
	} else if (action === "update") {
		submitLabel = "Update";
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg);
				return;
			}
			update();
		};
		cancelForm = cancel;
	}

	function setMember(sapin: number) {
		const user = userEntities[sapin];
		if (user) {
			const member: MemberAdd = {
				...user,
				Affiliation: '',
				Status: 'Non-Voter'
			}
			updateMember(member);
		}
	}

	return (
		<Form
			className="main"
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			{action === "add" &&
				<UserSelector
					value={member.SAPIN as number}
					onChange={sapin => setMember(sapin)}
				/>
			}
			<MemberBasicInfo
				sapins={action === "add"? [member.SAPIN as number]: sapins}
				member={member}
				saved={saved}
				updateMember={updateMember}
				readOnly={readOnly}
			/>
			<Row>
				{action !== "add" && !basicOnly ? (
					<MemberDetailInfo
						sapin={sapins[0]}
						member={member}
						saved={saved}
						updateMember={updateMember}
						readOnly={readOnly}
					/>
				) : (
					<MemberContactInfo
						edited={member}
						saved={saved}
						onChange={updateMember}
						readOnly={readOnly}
					/>
				)}
			</Row>
		</Form>
	);
}

type NormalizeOptions<T> = {
	selectId?: (entry: T) => string | number;
};

function normalize<T>(arr: T[], options?: NormalizeOptions<T>) {
	const selectId = options?.selectId || ((entry: any) => entry.id);
	const ids: (number | string)[] = [];
	const entities: Record<number | string, T> = {};
	arr.forEach((entity) => {
		const id = selectId(entity);
		entities[id] = entity;
		ids.push(id);
	});
	return { ids, entities };
}

function arrayDiff<T extends { id: number }>(
	originalArr1: T[],
	updatedArr2: T[]
): {
	updates: { id: number; changes: Partial<T> }[];
	adds: T[];
	deletes: number[];
};
function arrayDiff<T extends { id: string }>(
	originalArr1: T[],
	updatedArr2: T[]
): {
	updates: { id: string; changes: Partial<T> }[];
	adds: T[];
	deletes: string[];
};
function arrayDiff<T extends { id: number | string }>(
	originalArr1: T[],
	updatedArr2: T[]
): {
	updates: { id: number | string; changes: Partial<T> }[];
	adds: T[];
	deletes: (number | string)[];
} {
	const updates: { id: number | string; changes: Partial<T> }[] = [];
	const deletes: (number | string)[] = [];
	let { ids: ids1, entities: entities1 } = normalize(originalArr1);
	let { ids: ids2, entities: entities2 } = normalize(updatedArr2);
	ids1.forEach((id1) => {
		if (entities2[id1]) {
			const changes = shallowDiff(entities1[id1], entities2[id1]);
			if (Object.keys(changes).length > 0)
				updates.push({ id: id1, changes });
		} else {
			deletes.push(id1);
		}
		ids2 = ids2.filter((id2) => id2 !== id1);
	});
	const adds: T[] = ids2.map((id2) => entities2[id2]);
	return { updates, adds, deletes };
}

export function useMembersUpdate() {
	const dispatch = useAppDispatch();
	return async (
		edited: MultipleMember,
		saved: MultipleMember,
		members: MemberAdd[]
	) => {
		const changes = shallowDiff(saved, edited) as Partial<Member>;
		const p: AppThunk[] = [];
		if ("StatusChangeHistory" in changes) {
			const { updates, adds, deletes } = arrayDiff(
				saved.StatusChangeHistory,
				edited.StatusChangeHistory
			);
			members.forEach((m) => {
				if (updates.length > 0)
					p.push(updateMemberStatusChangeEntries(m.SAPIN, updates));
				if (deletes.length > 0)
					p.push(deleteMemberStatusChangeEntries(m.SAPIN, deletes));
				if (adds.length > 0)
					p.push(addMemberStatusChangeEntries(m.SAPIN, adds));
			});
			delete changes.StatusChangeHistory;
		}
		if (Object.keys(changes).length > 0) {
			const updates = members.map((m) => ({ id: m.SAPIN, changes }));
			p.push(updateMembers(updates));
		}
		await Promise.all(p.map(dispatch));
	};
}

export function useMembersAdd() {
	const dispatch = useAppDispatch();
	return async (
		edited: MultipleMember,
		saved: MultipleMember,
		members: MemberAdd[]
	) => {
		const changes = deepDiff(saved, edited);
		const newMembers = changes
			? members.map((m) => deepMerge(m, changes))
			: members;
		const ids = await dispatch(addMembers(newMembers));
		return ids;
	};
}

export function useMembersDelete() {
	const dispatch = useAppDispatch();
	return async (members: MemberAdd[]) => {
		const sapins = members.map((m) => m.SAPIN);
		await dispatch(deleteMembers(sapins));
		return;
	};
}
