import React from "react";
import { connect, ConnectedProps } from "react-redux";
import type { EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

import {
	Form,
	ActionButton,
	Row,
	Col,
	Field,
	FieldLeft,
	Checkbox,
	Input,
	ConfirmModal,
	shallowDiff,
	deepDiff,
	deepMergeTagMultiple,
	isMultiple,
	Multiple,
} from "dot11-components";

import type { RootState } from "../store";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { AccessLevel } from "../store/user";
import {
	setUiProperties,
	selectUiProperties,
	addMembers,
	updateMembers,
	deleteMembers,
	addMemberStatusChangeEntries,
	updateMemberStatusChangeEntries,
	deleteMemberStatusChangeEntries,
	setSelected,
	selectMembersState,
	selectMemberEntities,
	selectMemberWithParticipationSummary,
	selectUserMembersAccess,
	type Member,
	type MemberAdd,
} from "../store/members";

import StatusSelector from "./StatusSelector";
import MemberSelector from "./MemberAllSelector";
import MemberStatusChangeHistory from "./MemberStatusChange";
import MemberContactInfo from "./MemberContactInfo";
import MemberPermissions from "./MemberPermissions";
import MemberAttendances from "../sessionParticipation/MemberAttendances";
import MemberBallotParticipation from "../ballotParticipation/MemberBallotParticipation";
import ShowAccess from "../components/ShowAccess";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

const defaultMember = {
	SAPIN: 0,
	Name: "",
	FirstName: "",
	LastName: "",
	MI: "",
	Email: "",
	Status: "Non-Voter",
	Affiliation: "",
	Employer: "",
	Access: 0,
	ContactInfo: {
		StreetLine1: "",
		StreetLine2: "",
		City: "",
		State: "",
		Zip: "",
		Country: "",
		Phone: "",
		Fax: "",
	},
};

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
	member,
	updateMember,
	readOnly,
}: {
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const tabIndex: number = useAppSelector(selectUiProperties).tabIndex || 0;
	const setTabIndex = (tabIndex: number) => {
		dispatch(setUiProperties({ tabIndex }));
	};

	const SAPIN = member.SAPIN[0];

	const memberEntitiesWithParticipation = useAppSelector(selectMemberWithParticipationSummary);
	const memberWithParticipation = memberEntitiesWithParticipation[SAPIN];
	const sessionSumary = memberWithParticipation?.AttendancesSummary || "";
	const ballotSummary = memberWithParticipation?.BallotParticipationSummary || "";

	return (
		<Tabs
			style={{ width: "100%" }}
			onSelect={setTabIndex}
			selectedIndex={tabIndex}
		>
			<TabList>
				<Tab>Contact info</Tab>
				<Tab>Permissions</Tab>
				<Tab>Status history</Tab>
				<Tab>{`Session participation ${sessionSumary}`}</Tab>
				<Tab>{`Ballot participation ${ballotSummary}`}</Tab>
			</TabList>
			<TabPanel>
				<MemberContactInfo
					member={member}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberPermissions
					member={member}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberStatusChangeHistory
					member={member}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberAttendances SAPIN={SAPIN} readOnly={readOnly} />
			</TabPanel>
			<TabPanel>
				<MemberBallotParticipation SAPIN={SAPIN} readOnly={readOnly} />
			</TabPanel>
		</Tabs>
	);
}

function ExpandingInput({
	dataKey,
	member,
	updateMember,
}: {
	dataKey: keyof MultipleMember;
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
}) {
	const value: any = member[dataKey] || "";
	return (
		<Input
			type="text"
			style={{ width: `${Math.max(value.length, 20) + 2}ch` }}
			name={dataKey}
			value={isMultiple(value) ? "" : value}
			onChange={(e) => updateMember({ [dataKey]: e.target.value })}
			placeholder={isMultiple(value) ? MULTIPLE_STR : BLANK_STR}
		/>
	);
}

function MemberEntryForm({
	action,
	member,
	updateMember,
	submit,
	cancel,
	readOnly,
}: {
	action: Action;
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	submit: () => void;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const hasMany = member.SAPIN.length > 1;
	const sapinsStr = member.SAPIN.join(", ");
	const sapinsLabel = hasMany ? "SA PINs:" : "SA PIN:";

	let errMsg = "";
	if (!member.Name) errMsg = "Name not set";
	else if (!member.Affiliation) errMsg = "Affiliation not set";

	let submitForm, cancelForm, submitLabel;
	let title = "Member detail";
	if (submit) {
		if (action === "add") {
			submitLabel = "Add";
			title = "Add member";
		} else {
			submitLabel = "Update";
			title = "Update member";
		}
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg);
				return;
			}
			submit();
		};
		cancelForm = cancel;
	}
	let statusChangeDate = "";
	if (!isMultiple(member.StatusChangeDate) && member.StatusChangeDate)
		statusChangeDate = DateTime.fromISO(member.StatusChangeDate).toISODate() || "";

	return (
		<Form
			className="main"
			title={title}
			//busy={busy}
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
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
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Email:">
					<ExpandingInput
						dataKey="Email"
						member={member}
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Employer:">
					<ExpandingInput
						dataKey="Employer"
						member={member}
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Affiliation:">
					<ExpandingInput
						dataKey="Affiliation"
						member={member}
						updateMember={updateMember}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Status:">
					<StatusSelector
						style={{ flexBasis: 200 }}
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
							checked={!!member.StatusChangeOverride}
							indeterminate={isMultiple(
								member.StatusChangeOverride
							)}
							onChange={(
								e: React.ChangeEvent<HTMLInputElement>
							) =>
								updateMember({
									StatusChangeOverride: e.target.checked
										? 1
										: 0,
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
							type='date'
							value={statusChangeDate}
							onChange={e => updateMember({StatusChangeDate: e.target.value})}
							placeholder={isMultiple(member.StatusChangeDate)? MULTIPLE_STR: undefined}
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
					<Row>
						{action === "update" ? (
							<MemberDetailInfo
								member={member}
								updateMember={updateMember}
								readOnly={readOnly}
							/>
						) : (
							<MemberContactInfo
								member={member}
								updateMember={updateMember}
								readOnly={readOnly}
							/>
						)}
					</Row>
				</>
			)}
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

type MemberDetailProps = {
	style?: React.CSSProperties;
	className?: string;
	readOnly?: boolean;
	selected?: EntityId[];
	getAsMember?: (sapin: number) => MemberAdd | undefined;
};

type MemberDetailInternalProps = ConnectedMemberDetailProps & MemberDetailProps;

type Action = "add" | "update" | "wait";

export type MultipleMember = Multiple<
	Omit<
		MemberAdd,
		"SAPIN" | "StatusChangeHistory" | "ContactEmails" | "ContactInfo"
	>
> & {
	SAPIN: number[];
	StatusChangeHistory: Member["StatusChangeHistory"];
	ContactEmails: Member["ContactEmails"];
	ContactInfo: Multiple<Member["ContactInfo"]>;
};

type MemberDetailState = (
	| {
			action: "void";
			saved: null;
			edited: null;
	  }
	| {
			action: "update" | "add";
			saved: MultipleMember;
			edited: MultipleMember;
	  }
) & {
	originals: MemberAdd[];
	message: string;
};

class MemberDetail extends React.Component<
	MemberDetailInternalProps,
	MemberDetailState
> {
	constructor(props: MemberDetailInternalProps) {
		super(props);
		this.state = this.initState("update");
	}

	componentDidUpdate(
		prevProps: Readonly<MemberDetailInternalProps>,
		prevState: Readonly<MemberDetailState>,
		snapshot?: any
	): void {
		if (this.state.edited === this.state.saved && this.state === prevState)
			this.setState(this.initState("update"));
	}

	initState = (action: Action): MemberDetailState => {
		const { members, selected, getAsMember } = this.props;

		if (getAsMember) {
			if (selected.length > 0 && selected.every((id) => members[id])) {
				// All selected are existing members
				let edited = {} as MultipleMember,
					saved = {} as MultipleMember;
				let originals: Member[] = [];
				selected.forEach((sapin) => {
					const attendee = getAsMember(sapin as number);
					if (!attendee) {
						console.warn("Can't get member with SAPIN=" + sapin);
						return;
					}
					const member = members[sapin]!;
					const { Status, Access, SAPIN, ...rest } = attendee;
					const changes = shallowDiff(
						member,
						rest
					) as Partial<Member>;
					edited = deepMergeTagMultiple(edited, {
						...member,
						...changes,
					}) as MultipleMember;
					saved = deepMergeTagMultiple(
						saved,
						member
					) as MultipleMember;
					originals.push(member);
				});
				edited.SAPIN = selected as number[];
				saved.SAPIN = selected as number[];
				const diff = deepDiff(edited, saved);
				if (Object.keys(diff).length > 0) saved = edited;
				return {
					action: "update",
					edited,
					saved,
					originals,
					message: "",
				};
			} else if (
				selected.length > 0 &&
				selected.every((id) => !members[id])
			) {
				// All selected are new attendees
				let diff = {} as MultipleMember;
				let originals: MemberAdd[] = [];
				selected.forEach((sapin) => {
					const attendee = getAsMember(sapin as number);
					if (!attendee) {
						console.warn("Can't get member with SAPIN=" + sapin);
						return;
					}
					const date = new Date().toISOString();
					const contactEmail = {
						id: 0,
						Email: attendee.Email,
						Primary: 1,
						Broken: 0,
						DateAdded: date,
					};
					const { Status, Access, SAPIN, ...rest } = attendee;
					const newMember = {
						...rest,
						DateAdded: date,
						ContactEmails: [contactEmail],
					};
					diff = deepMergeTagMultiple(
						diff,
						newMember
					) as MultipleMember;
					originals.push(attendee);
				});
				diff.SAPIN = selected as number[];
				return {
					action: "add",
					edited: diff,
					saved: diff,
					originals,
					message: "",
				};
			} else {
				const message =
					selected.length > 0
						? "Mix of new attendees and existing members selected"
						: "Nothing selected";
				return {
					action: "void",
					edited: null,
					saved: null,
					originals: [],
					message,
				};
			}
		} else {
			if (action === "add") {
				const entry: MultipleMember = {
					...defaultMember,
					SAPIN: [0],
					StatusChangeHistory: [],
					ContactEmails: [],
				};
				return {
					action: "add",
					edited: entry,
					saved: entry,
					originals: [],
					message: "",
				};
			} else if (selected.length > 0) {
				let diff = {} as MultipleMember;
				let originals: Member[] = [];
				selected.forEach((sapin) => {
					const member = members[sapin];
					if (!member) {
						console.warn("Can't get member with SAPIN=" + sapin);
						return;
					}
					diff = deepMergeTagMultiple(diff, member) as MultipleMember;
					originals.push(member);
				});
				diff.SAPIN = selected as number[];
				return {
					action: "update",
					edited: diff,
					saved: diff,
					originals,
					message: "",
				};
			} else {
				return {
					action: "void",
					edited: null,
					saved: null,
					originals: [],
					message: "Nothing selected",
				};
			}
		}
	};

	updateMember = (changes: Partial<Omit<Member, "SAPIN">>) => {
		const { readOnly } = this.props;
		const { action } = this.state;

		if (readOnly || action === "void") {
			console.warn("Update in bad state");
			return;
		}

		let { saved, edited } = this.state;
		edited = { ...edited, ...changes };
		const diff = deepDiff(saved, edited);
		if (Object.keys(diff).length === 0) saved = edited;
		this.setState({ edited, saved });
	};

	hasUpdates = () => this.state.saved !== this.state.edited;

	clickAdd = async () => {
		const { action } = this.state;

		if (action === "update" && this.hasUpdates()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}

		this.setState(this.initState("add"));
	};

	clickDelete = async () => {
		const { deleteMembers } = this.props;
		const { originals } = this.state;
		if (originals.length === 0) return;
		const sapins = originals.map((o) => o.SAPIN);
		const str =
			"Are you sure you want to delete:\n" +
			originals.map((o) => `${o.SAPIN} ${o.Name}`).join("\n");
		const ok = await ConfirmModal.show(str);
		if (ok) await deleteMembers(sapins);
	};

	add = async () => {
		const { addMembers, setSelected } = this.props;
		const { action, saved, edited, originals } = this.state;
		if (action !== "add") {
			console.warn("Add with unexpected state");
			return;
		}
		const newMembers = originals.map((m) => {
			const changes = shallowDiff(saved, edited) as Partial<MemberAdd>;
			return { ...m, ...changes };
		});
		const ids = await addMembers(newMembers);
		setSelected(ids);
		this.setState({ action: "void", saved: null, edited: null });
	};

	update = async () => {
		const { updateMembers } = this.props;
		const { action, edited, saved, originals } = this.state;
		if (action !== "update") {
			console.warn("Update with unexpected state");
			return;
		}
		const changes = shallowDiff(saved, edited) as Partial<Member>;
		const p: Promise<any>[] = [];
		if ("StatusChangeHistory" in changes) {
			const {
				updateMemberStatusChangeEntries,
				deleteMemberStatusChangeEntries,
				addMemberStatusChangeEntries,
			} = this.props;
			const { updates, adds, deletes } = arrayDiff(
				saved.StatusChangeHistory,
				edited.StatusChangeHistory
			);
			originals.forEach((m) => {
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
			const updates = originals.map((m) => ({ id: m.SAPIN, changes }));
			p.push(updateMembers(updates));
		}
		await Promise.all(p);
		//this.setState(state => ({...state, saved: edited}));
		this.setState({ action: "void", saved: null, edited: null });
	};

	cancel = () => {
		this.setState(this.initState("update"));
	};

	render() {
		const { loading } = this.props;
		const { originals, action, message } = this.state;

		let readOnly =
			this.props.readOnly || this.props.access < AccessLevel.rw;

		let submit: any | undefined;
		if (action === "add") {
			submit = this.add;
		} else if (action === "update" && this.hasUpdates()) {
			submit = this.update;
		}

		return (
			<>
				<div className="top-row justify-right">
					{!readOnly && (
						<>
							<ActionButton
								name="add"
								title="Add member"
								disabled={loading}
								isActive={action === "add"}
								onClick={this.clickAdd}
							/>
							<ActionButton
								name="delete"
								title="Delete member"
								disabled={loading || originals.length === 0}
								onClick={this.clickDelete}
							/>
						</>
					)}
				</div>
				{action === "void" || loading ? (
					<div className="placeholder">
						<span>{loading ? "Loading..." : message}</span>
					</div>
				) : (
					<MemberEntryForm
						action={action}
						member={this.state.edited}
						updateMember={this.updateMember}
						submit={submit}
						cancel={this.cancel}
						readOnly={readOnly}
					/>
				)}
				<ShowAccess access={this.props.access} />
			</>
		);
	}
}

const connector = connect(
	(state: RootState, props: MemberDetailProps) => {
		const members = selectMembersState(state);
		return {
			members: members.entities,
			loading: members.loading,
			selected: props.selected ? props.selected : members.selected,
			uiProperties: selectUiProperties(state),
			access: selectUserMembersAccess(state),
		};
	},
	{
		addMembers,
		updateMembers,
		addMemberStatusChangeEntries,
		updateMemberStatusChangeEntries,
		deleteMemberStatusChangeEntries,
		deleteMembers,
		setSelected,
		setUiProperties,
	}
);

type ConnectedMemberDetailProps = ConnectedProps<typeof connector>;

const ConnectedMemberDetail = connector(MemberDetail);

export default ConnectedMemberDetail;
