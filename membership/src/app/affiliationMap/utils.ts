import type { EntityId } from "@reduxjs/toolkit";
import { shallowDiff } from "@common";
import { useAppDispatch } from "@/store/hooks";
import {
	AffiliationMap,
	AffiliationMapCreate,
	addAffiliationMaps,
	updateAffiliationMaps,
	deleteAffiliationMaps,
} from "@/store/affiliationMap";

export function useAffiliationMapUpdate() {
	const dispatch = useAppDispatch();

	return async (edited: AffiliationMap, saved: AffiliationMap) => {
		const update = { id: edited.id, changes: shallowDiff(saved, edited) };
		if (Object.keys(update.changes).length > 0)
			await dispatch(updateAffiliationMaps([update]));
	};
}

export function useAffiliationMapAdd() {
	const dispatch = useAppDispatch();
	return async (edited: AffiliationMapCreate) => {
		const maps = await dispatch(addAffiliationMaps([edited]));
		return maps ? maps[0] : undefined;
	};
}

export function useAffiliationMapsDelete() {
	const dispatch = useAppDispatch();
	return async (ids: EntityId[]) => {
		await dispatch(deleteAffiliationMaps(ids));
	};
}
