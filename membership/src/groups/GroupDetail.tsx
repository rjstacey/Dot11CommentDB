import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { EntityId, Dictionary } from "@reduxjs/toolkit";
import styled from "@emotion/styled";

import {
	ConfirmModal,
	deepDiff,
	deepMerge,
	deepMergeTagMultiple,
	Multiple,
	ActionButton,
	setError,
} from "dot11-components";

import { RootState } from "../store";
import { AccessLevel,  } from "../store/user";
import {
	addGroup,
	updateGroups,
	deleteGroups,
	selectGroupsState,
	selectUserGroupsAccess,
	selectWorkingGroupId,
	setSelected,
	Group,
	GroupCreate,
	GroupUpdate,
} from "../store/groups";
import {
	addOfficers,
	updateOfficers,
	deleteOfficers,
	selectOfficersState,
	getGroupOfficers,
	OfficerId,
	Officer,
	OfficerUpdate,
	OfficerCreate,
} from "../store/officers";

import TopRow from "../components/TopRow";
import ShowAccess from "../components/ShowAccess";
import GroupEntryEdit from "./GroupEntry";

const BLANK_STR = "(Blank)";

const defaultEntry: GroupEntry = {
	parent_id: null,
	name: "",
	type: "tg",
	status: 1,
	color: "white",
	symbol: null,
	project: null,
	officerSAPINs: [],
	officers: [],
};

const Container = styled.div`
	padding: 10px;
	label {
		font-weight: bold;
	}
`;

const NotAvailable = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

export type GroupEntry = GroupCreate & { officers: Officer[] };
export type MultipleGroupEntry = Multiple<GroupCreate> & {
	officers: Officer[];
};

type GroupDetailState = (
	| {
			action: "update";
			entry: MultipleGroupEntry;
			saved: MultipleGroupEntry;
	  }
	| {
			action: "add";
			entry: GroupEntry;
			saved: GroupEntry;
	  }
) & {
	ids: EntityId[];
	entities: Dictionary<Group>;
	officers: Officer[];
	busy: boolean;
};

class GroupDetail extends React.Component<
	GroupDetailConnectedProps,
	GroupDetailState
> {
	constructor(props: GroupDetailConnectedProps) {
		super(props);
		this.state = this.initState();
	}

	componentDidUpdate() {
		const { selected, setSelected } = this.props;
		const { ids } = this.state;

		const changeWithConfirmation = async () => {
			if (this.hasUpdates()) {
				const ok = await ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				);
				if (!ok) {
					setSelected(ids);
					return;
				}
			}
			this.reinitState();
		};

		if (selected.join() !== ids.join()) changeWithConfirmation();
	}

	initState = (): GroupDetailState => {
		const {
			entities,
			selected: ids,
			officerIds,
			officerEntities,
		} = this.props;

		// Store original entities
		const originalEntities: typeof entities = {};
		ids.forEach((id) => (originalEntities[id] = entities[id]));

		// Coalesce entry
		let entry = {} as MultipleGroupEntry;
		ids.forEach(
			(id) =>
				(entry = deepMergeTagMultiple(
					entry,
					entities[id]!
				) as MultipleGroupEntry)
		);

		// If editing a single group, get officer list
		let officers: Officer[] = [];
		if (ids.length === 1) {
			const group_id = ids[0];
			officers = getGroupOfficers(officerIds, officerEntities, group_id);
		}
		entry.officers = officers;

		return {
			action: "update",
			entry,
			saved: entry,
			ids,
			entities: originalEntities,
			officers,
			busy: false,
		};
	};

	reinitState = () => this.setState(this.initState());

	hasUpdates = () => this.state.saved !== this.state.entry;

	changeEntry = (changes: Partial<GroupEntry>) => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Can't change entry; insufficient access");
			return;
		}
		this.setState((state) => {
			let entry: MultipleGroupEntry = deepMerge(
				state.entry as MultipleGroupEntry,
				changes
			);
			// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
			//console.log(changes, entry)
			changes = deepDiff(state.saved, entry) as Partial<GroupEntry>;
			if (Object.keys(changes).length === 0) entry = state.saved;
			return { ...state, entry };
		});
	};

	clickAdd = () => {
		const { setSelected, groupId } = this.props;
		setSelected([]);
		const entry = {
			...defaultEntry,
			parent_id: groupId,
		};
		this.setState({
			action: "add",
			entry,
			saved: entry,
			entities: {},
			ids: [],
			busy: false,
		});
	};

	clickDelete = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access to delete entry");
			return;
		}
		const { deleteGroups } = this.props;
		const { ids, entities } = this.state;
		const groupNames = ids.map((id) => entities[id]!.name || BLANK_STR);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${groupNames.join(", ")}?`
		);
		if (!ok) return;
		await deleteGroups(ids);
	};

	add = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for add entry");
			return;
		}
		const { addGroup, setSelected, setError, groupId, entities } =
			this.props;
		const entry = this.state.entry as GroupCreate;
		let group: Group;
		for (group of Object.values(entities) as Group[]) {
			if (group!.parent_id === groupId && group!.name === entry.name) {
				setError(
					"Unable to add entry",
					"Entry already exists for " + (group!.name || BLANK_STR)
				);
				return;
			}
		}
		this.setState({ busy: true });
		group = await addGroup(entry);
		setSelected([group.id]);
		this.reinitState();
	};

	update = async () => {
		const { updateGroups, addOfficers, updateOfficers, deleteOfficers } =
			this.props;
		const { entities, ids, officers } = this.state;
		const { officers: updatedOfficers, ...entry } = this.state.entry;

		this.setState({ busy: true });

		let expectedEntry: Partial<Group> = {};
		ids.forEach((id) => {
			expectedEntry = deepMergeTagMultiple(
				expectedEntry,
				entities[id]!
			) as Partial<Group>;
		});
		let diff = deepDiff(expectedEntry, entry) || {};

		const updates: GroupUpdate[] = [];
		for (const id of ids) {
			const entity = entities[id]!;
			const updated = { ...entity, ...diff };
			const changes: Partial<Group> = deepDiff(entity, updated);
			if (Object.keys(changes).length > 0) updates.push({ id, changes });
		}
		await updateGroups(updates);

		if (ids.length === 1) {
			const officerAdds: OfficerCreate[] = [],
				officerUpdates: OfficerUpdate[] = [],
				officerDeletes: OfficerId[] = [];

			for (const o1 of updatedOfficers) {
				const o2 = officers.find((o) => o.id === o1.id);
				if (o2) {
					const changes = deepDiff(o2, o1) || {};
					if (Object.keys(changes).length > 0)
						officerUpdates.push({ id: o2.id!, changes });
				} else {
					officerAdds.push(o1);
				}
			}
			for (const o2 of officers) {
				if (!updatedOfficers.find((o) => o.id === o2.id))
					officerDeletes.push(o2.id);
			}
			if (officerAdds.length > 0) await addOfficers(officerAdds);
			if (officerUpdates.length > 0) await updateOfficers(officerUpdates);
			if (officerDeletes.length > 0) await deleteOfficers(officerDeletes);
		}

		this.reinitState();
	};

	cancel = async () => {
		const { setSelected } = this.props;
		setSelected([]);
		this.reinitState();
	};

	render() {
		const { selected, loading, access } = this.props;
		const { entry, ids, action, busy } = this.state;

		let notAvailableStr = "";
		if (loading) notAvailableStr = "Loading...";
		else if (action === "update" && ids.length === 0)
			notAvailableStr = "Nothing selected";

		const readOnly = access <= AccessLevel.ro;

		let submit, cancel, title;
		if (action === "add") {
			submit = this.add;
			cancel = this.cancel;
			title = "Add group";
		} else if (action === "update" && this.hasUpdates()) {
			submit = this.update;
			cancel = this.cancel;
			title = "Update group";
		}

		return (
			<Container>
				<TopRow style={{ justifyContent: "flex-end" }}>
					<ActionButton
						name="add"
						title="Add group"
						disabled={loading || readOnly}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name="delete"
						title="Delete group"
						disabled={loading || selected.length === 0 || readOnly}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr ? (
					<NotAvailable>{notAvailableStr}</NotAvailable>
				) : (
					<GroupEntryEdit
						action={action}
						title={title}
						entry={entry}
						changeEntry={this.changeEntry}
						submit={submit}
						cancel={cancel}
						busy={busy}
						readOnly={readOnly}
					/>
				)}
				<ShowAccess access={access} />
			</Container>
		);
	}
}

const connector = connect(
	(state: RootState) => {
		const { loading, selected, entities } = selectGroupsState(state);
		const { ids: officerIds, entities: officerEntities } =
			selectOfficersState(state);
		return {
			loading,
			selected,
			entities,
			officerEntities,
			officerIds,
			groupId: selectWorkingGroupId(state),
			access: selectUserGroupsAccess(state),
		};
	},
	{
		addGroup,
		updateGroups,
		deleteGroups,
		addOfficers,
		updateOfficers,
		deleteOfficers,
		setSelected,
		setError,
	}
);

type GroupDetailConnectedProps = ConnectedProps<typeof connector>;

const ConnectedGroupDetail = connector(GroupDetail);

export default ConnectedGroupDetail;
