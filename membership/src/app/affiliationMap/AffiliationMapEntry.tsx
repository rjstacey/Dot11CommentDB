import { Form, Row, Field, Input, shallowDiff } from "dot11-components";

import { useAppDispatch } from "@/store/hooks";
import {
	AffiliationMap,
	AffiliationMapCreate,
	addAffiliationMaps,
	updateAffiliationMaps,
	deleteAffiliationMaps,
} from "@/store/affiliationMap";
import { EntityId } from "@reduxjs/toolkit";

export type EditAction = "view" | "update" | "add";

function checkEntry(entry: AffiliationMap): string | undefined {
	if (!entry.match) return "Set match expression";
	if (!entry.shortAffiliation) return "Set short affiliation name";
}

export function AffiliationMapEntryForm({
	action,
	entry,
	change,
	busy,
	submit,
	cancel,
	readOnly,
}: {
	action: EditAction;
	entry: AffiliationMap;
	change: (changes: Partial<AffiliationMap>) => void;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	return (
		<Form
			className="main"
			busy={busy}
			submitLabel={action === "add" ? "Add" : "Update"}
			submit={submit}
			cancel={cancel}
			errorText={checkEntry(entry)}
		>
			<Row>
				<Field label="Match expression:">
					<Input
						type="search"
						value={entry.match}
						onChange={(e) => change({ match: e.target.value })}
						placeholder="(Blank)"
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Short affiliation name:">
					<Input
						type="text"
						value={entry.shortAffiliation}
						onChange={(e) =>
							change({ shortAffiliation: e.target.value })
						}
						placeholder="(Blank)"
						disabled={readOnly}
					/>
				</Field>
			</Row>
		</Form>
	);
}

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
