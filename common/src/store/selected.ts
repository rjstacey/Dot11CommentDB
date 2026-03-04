import type {
	EntityId,
	PayloadAction,
	Action,
	ActionReducerMapBuilder,
	EntityState,
} from "@reduxjs/toolkit";

const name = "selected";

export type SelectedState<Id extends EntityId> = { [name]: Id[] };

export function createSelectedSubslice<Id extends EntityId>(dataSet: string) {
	const initialState: SelectedState<Id> = { [name]: [] };

	const reducers = {
		setSelected(state: SelectedState<Id>, action: PayloadAction<Id[]>) {
			state[name] = action.payload;
		},
		toggleSelected(state: SelectedState<Id>, action: PayloadAction<Id[]>) {
			const list = state[name];
			for (let id of action.payload) {
				const i = list.indexOf(id);
				if (i >= 0) list.splice(i, 1);
				else list.push(id);
			}
		},
	};

	const extraReducers = <
		S extends EntityState<unknown, Id> & SelectedState<Id>,
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

export function getSelectedSelectors<S, Id extends EntityId = EntityId>(
	selectState: (state: S) => SelectedState<Id>,
) {
	return {
		/** The list of ids that represent selected rows */
		selectSelected: (state: S) => selectState(state)[name],
	};
}
