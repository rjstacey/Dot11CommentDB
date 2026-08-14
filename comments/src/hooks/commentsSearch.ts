import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { createSelector } from "@reduxjs/toolkit";

import type { RootState } from "@/store";
import { selectCommentsState, selectCommentEntities } from "@/store/comments";
import {
	layoutOptions,
	selectCommentsLayout,
	type Layout
} from "./commentsLayout";
import { useAppSelector } from "@/store/hooks";

export { type Layout, layoutOptions };

export const selectCommentsSearch = createSelector(
	(state: RootState) => selectCommentsState(state).selected,
	selectCommentEntities,
	selectCommentsLayout,
	(selected, entities, layout) => {
		const searchParams = new URLSearchParams();
		if (layout) searchParams.append("layout", layout);
		selected
			.map(id => {
				const entity = entities[id];
				return entity ? entity.CID : null;
			})
			.forEach(cid => {
				if (cid) searchParams.append("cid", cid);
			});
		return searchParams.toString();
	}
);

export function useCommentsSearch () {
	const [searchParams, setSearchParams] = useSearchParams();
	const layout = useAppSelector(selectCommentsLayout);
	const entities = useAppSelector(selectCommentEntities);

	const setLayout = useCallback(
		(layout: string | null) => {
			if (layout) searchParams.set("layout", layout);
			else searchParams.delete("layout");
			setSearchParams(searchParams);
		},
		[searchParams, setSearchParams]
	);

	const setSelected = useCallback(
		(selected: (string | number)[]) => {
			console.log("setSelected", selected);
			searchParams.delete("cid");
			selected
				.map(id => {
					const entity = entities[id];
					return entity ? entity.CID : null;
				})
				.forEach(cid => {
					if (cid) searchParams.append("cid", cid);
				});
			setSearchParams(searchParams);
		},
		[entities, searchParams, setSearchParams]
	);

	return { layout, setLayout, setSelected };
}
