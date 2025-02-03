import { shallowDiff } from "dot11-components";
import { useAppDispatch } from "@/store/hooks";
import {
	addGroup,
	updateGroups,
	deleteGroups,
	Group,
	GroupCreate,
	GroupUpdate,
} from "@/store/groups";
import {
	addOfficers,
	updateOfficers,
	deleteOfficers,
	OfficerCreate,
	OfficerUpdate,
	OfficerId,
} from "@/store/officers";
import type { MultipleGroupEntry } from "./GroupEntry";

export function useGroupsUpdate() {
	const dispatch = useAppDispatch();

	return async (
		edited: MultipleGroupEntry,
		saved: MultipleGroupEntry,
		groups: Group[]
	) => {
		const { officers: savedOfficers, ...savedEntry } = saved;
		const { officers: editedOfficers, ...editedEntry } = edited;

		const edits = shallowDiff(savedEntry, editedEntry);
		const updates: GroupUpdate[] = [];
		for (const group of groups) {
			const changes = shallowDiff(group, {
				...group,
				...edits,
			}) as Partial<Group>;
			if (Object.keys(changes).length > 0) {
				updates.push({ id: group.id, changes });
			}
		}
		if (updates.length > 0) await dispatch(updateGroups(updates));

		if (groups.length === 1) {
			const officerAdds: OfficerCreate[] = [],
				officerUpdates: OfficerUpdate[] = [],
				officerDeletes: OfficerId[] = [];

			for (const o1 of editedOfficers) {
				const o2 = savedOfficers.find((o) => o.id === o1.id);
				if (o2) {
					const changes = shallowDiff(o2, o1);
					if (Object.keys(changes).length > 0)
						officerUpdates.push({ id: o2.id, changes });
				} else {
					officerAdds.push(o1);
				}
			}
			for (const o2 of savedOfficers) {
				if (!editedOfficers.find((o) => o.id === o2.id))
					officerDeletes.push(o2.id);
			}
			if (officerAdds.length > 0)
				await dispatch(addOfficers(officerAdds));
			if (officerUpdates.length > 0)
				await dispatch(updateOfficers(officerUpdates));
			if (officerDeletes.length > 0)
				await dispatch(deleteOfficers(officerDeletes));
		}
	};
}

export function useGroupAdd() {
	const dispatch = useAppDispatch();
	return async (edited: MultipleGroupEntry) => {
		let { officers, ...newGroup } = edited; // eslint-disable-line
		const group = await dispatch(addGroup(newGroup as GroupCreate));
		if (group) {
			if (officers.length) {
				officers = officers.map((o) => ({ ...o, group_id: group.id }));
				await dispatch(addOfficers(officers));
			}
		}
		return group;
	};
}

export function useGroupsDelete() {
	const dispatch = useAppDispatch();
	return async (groups: Group[]) => {
		await dispatch(deleteGroups(groups.map((g) => g.id)));
		return;
	};
}
