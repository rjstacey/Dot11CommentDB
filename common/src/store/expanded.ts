import type {
	EntityId,
	PayloadAction,
	Action,
	ActionReducerMapBuilder,
	EntityState,
} from "@reduxjs/toolkit";

const name = "expanded";

export type ExpandedState<Id extends EntityId> = { [name]: Id[] };

export function createExpandedSubslice<Id extends EntityId>(dataSet: string) {
	const initialState: ExpandedState<Id> = { [name]: [] };

	const reducers = {
		/** Set the list of expanded rows to @param list */
		setExpanded(state: ExpandedState<Id>, action: PayloadAction<Id[]>) {
			state[name] = action.payload;
		},
		/** For @param list, remove entries that are present and add entries that are not present */
		toggleExpanded(state: ExpandedState<Id>, action: PayloadAction<Id[]>) {
			const list = state[name];
			for (let id of action.payload) {
				const i = list.indexOf(id);
				if (i >= 0) list.splice(i, 1);
				else list.push(id);
			}
		},
	};

	const extraReducers = <
		S extends EntityState<unknown, Id> & ExpandedState<Id>,
	>(
		builder: ActionReducerMapBuilder<S>,
	) => {
		builder.addMatcher(
			(action: Action) =>
				Boolean(
					action.type.startsWith(dataSet) &&
						action.type.match(/(removeOne|removeMany|getSuccess)$/),
				),
			(state) => {
				const list = state[name];
				const ids = state.ids;
				const newList = list.filter((id) => ids.includes(id));
				state[name] = newList.length === list.length ? list : newList;
			},
		);
	};

	return {
		name,
		initialState,
		reducers,
		extraReducers,
	};
}

export function getExpandedSelectors<S, Id extends EntityId = EntityId>(
	selectState: (state: S) => ExpandedState<Id>,
) {
	return {
		/** The list of ids that represent expanded rows */
		selectExpanded: (state: S) => selectState(state)[name],
	};
}
