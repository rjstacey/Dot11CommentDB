import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { createSelector } from "@reduxjs/toolkit";

import type { RootState } from "@/store";
import { selectCommentsState, selectCommentEntities } from "@/store/comments";
import {
	layoutOptions,
	selectCommentsLayout,
	selectCommentsPrevLayout,
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
	const [, setSearchParams] = useSearchParams();
	const s = useRef(setSearchParams);
	s.current = setSearchParams; // stable reference since setSearchParams changes with navigation

	const layout = useAppSelector(selectCommentsLayout);
	const prevLayout = useAppSelector(selectCommentsPrevLayout);
	const entities = useAppSelector(selectCommentEntities);

	const setLayout = useCallback((layout: string | null) => {
		s.current(searchParams => {
			if (layout) searchParams.set("layout", layout);
			else searchParams.delete("layout");
			return searchParams;
		});
	}, []);

	const setSelected = useCallback(
		(selected: (string | number)[]) => {
			s.current(searchParams => {
				searchParams.delete("cid");
				selected
					.map(id => {
						const entity = entities[id];
						return entity ? entity.CID : null;
					})
					.forEach(cid => {
						if (cid) searchParams.append("cid", cid);
					});
				return searchParams;
			});
			return () => {};
		},
		[entities]
	);

	return { layout, prevLayout, setLayout, setSelected };
}
