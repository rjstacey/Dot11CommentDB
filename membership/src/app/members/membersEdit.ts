import * as React from "react";
import { shallowDiff, deepMerge, deepDiff } from "dot11-components";
import type { AppThunk } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import {
	addMembers,
	updateMembers,
	deleteMembers,
	addMemberStatusChangeEntries,
	updateMemberStatusChangeEntries,
	deleteMemberStatusChangeEntries,
	type Member,
	type MemberCreate,
} from "@/store/members";

import type { MultipleMember } from "./MemberEdit";

type NormalizeOptions<T> = {
	selectId?: (entry: T) => string | number;
};

function normalize<T>(arr: T[], options?: NormalizeOptions<T>) {
	const selectId =
		options?.selectId ||
		((entry: T) => (entry as { id: string | number }).id);
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
	const { ids: ids1, entities: entities1 } = normalize(originalArr1);
	const { ids: _ids2, entities: entities2 } = normalize(updatedArr2);
	let ids2 = _ids2;
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
	return React.useCallback(
		async (
			edited: MultipleMember,
			saved: MultipleMember,
			members: MemberCreate[]
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
						p.push(
							updateMemberStatusChangeEntries(m.SAPIN, updates)
						);
					if (deletes.length > 0)
						p.push(
							deleteMemberStatusChangeEntries(m.SAPIN, deletes)
						);
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
		},
		[dispatch]
	);
}

export function useMembersAdd() {
	const dispatch = useAppDispatch();
	return React.useCallback(
		async (
			edited: MultipleMember,
			saved: MultipleMember,
			members: MemberCreate[]
		) => {
			const changes = deepDiff(saved, edited);
			const newMembers = changes
				? members.map((m) => deepMerge(m, changes))
				: members;
			const ids = await dispatch(addMembers(newMembers));
			return ids;
		},
		[dispatch]
	);
}

export function useMembersDelete() {
	const dispatch = useAppDispatch();
	return React.useCallback(
		async (members: MemberCreate[]) => {
			const sapins = members.map((m) => m.SAPIN);
			await dispatch(deleteMembers(sapins));
		},
		[dispatch]
	);
}
