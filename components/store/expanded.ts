import type {
	EntityId,
	PayloadAction,
	Action,
	ActionReducerMapBuilder,
} from "@reduxjs/toolkit";

const name = "expanded";

export type ExpandedState = { [name]: EntityId[] };

export function createExpandedSubslice(dataSet: string) {
	const initialState: ExpandedState = { [name]: [] };

	const reducers = {
		/** Set the list of expanded rows to @param list */
		setExpanded(state: ExpandedState, action: PayloadAction<EntityId[]>) {
			state[name] = action.payload;
		},
		/** For @param list, remove entries that are present and add entries that are not present */
		toggleExpanded(
			state: ExpandedState,
			action: PayloadAction<EntityId[]>
		) {
			const list = state[name];
			for (let id of action.payload) {
				const i = list.indexOf(id);
				if (i >= 0) list.splice(i, 1);
				else list.push(id);
			}
		},
	};

	const extraReducers = (
		builder: ActionReducerMapBuilder<ExpandedState & { ids: EntityId[] }>
	) => {
		builder.addMatcher(
			(action: Action) => Boolean(
				action.type.startsWith(dataSet) &&
				action.type.match(/(removeOne|removeMany|getSuccess)$/)),
			(state) => {
				const list = state[name];
				const ids = state.ids;
				const newList = list.filter((id) => ids.includes(id));
				state[name] = newList.length === list.length ? list : newList;
			}
		);
	};

	return {
		name,
		initialState,
		reducers,
		extraReducers,
	};
}

export function getExpandedSelectors<S>(
	selectState: (state: S) => ExpandedState
) {
	return {
		/** The list of ids that represent expanded rows */
		selectExpanded: (state: S) => selectState(state)[name],
	};
}
