import { useCallback } from "react";
import isEqual from "lodash.isequal";

import type { RootState, AppThunk } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCommentsState, setUiProperties } from "@/store/comments";

export const panelKeys = ["list", "detail", "draft"] as const;
export type PanelKey = typeof panelKeys[number];

export const layoutOptions = [
	"list",
	"detail",
	"draft",
	"list-detail",
	"list-draft",
	"detail-draft",
	"list-detail-draft",
	"list-draft-detail"
] as const;
export type Layout = typeof layoutOptions[number];

export const setCommentsLayout = (layout: string | null): AppThunk =>
	async (dispatch, getState) => {
		if (!layoutOptions.includes(layout as Layout)) layout = layoutOptions[0];
		const prevLayout = selectCommentsLayout(getState());
		dispatch(setUiProperties({ layout, prevLayout }));
	};

export const selectCommentsLayout = (state: RootState): Layout => {
	const { layout } = selectCommentsState(state).ui;
	return layout || layoutOptions[0];
};

export const selectCommentsPrevLayout = (state: RootState): Layout => {
	const { prevLayout } = selectCommentsState(state).ui;
	return prevLayout || layoutOptions[0];
};

const setCommentsPannelsState = (panelsState: {
	[x: string]: Record<string, number>;
}) => setUiProperties({ panelsState });

const selectCommentsPanelsState = (state: RootState) => {
	const panelsState: { [x: string]: Record<string, number> } =
		selectCommentsState(state).ui.panelsState || {};
	return panelsState;
};

const updateCommentsPanelWidths =
	(layout: string, widths: Record<string, number>): AppThunk =>
	async (dispatch, getState) => {
		const panelsState = selectCommentsPanelsState(getState());
		dispatch(setCommentsPannelsState({ ...panelsState, [layout]: widths }));
	};

export function useCommentsLayout () {
	const dispatch = useAppDispatch();

	const layout = useAppSelector(selectCommentsLayout);
	const visiblePanels = layout.split("-");

	const widths = useAppSelector(
		state => selectCommentsPanelsState(state)[layout] ?? {},
		isEqual
	);

	const setWidths = useCallback(
		(widths: Record<string, number>) => {
			dispatch(updateCommentsPanelWidths(layout, widths));
		},
		[layout, dispatch]
	);

	return { visiblePanels, widths, setWidths };
}
