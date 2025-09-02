import type {
	EntityId,
	PayloadAction,
	Action,
	ActionReducerMapBuilder,
} from "@reduxjs/toolkit";

const name = "selected";

export type SelectedState = { [name]: EntityId[] };

export function createSelectedSubslice(dataSet: string) {
	const initialState: SelectedState = { [name]: [] };

	const reducers = {
		setSelected(state: SelectedState, action: PayloadAction<EntityId[]>) {
			state[name] = action.payload;
		},
		toggleSelected(
			state: SelectedState,
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
		builder: ActionReducerMapBuilder<{ ids: EntityId[] } & SelectedState>
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

export function getSelectedSelectors<S>(
	selectState: (state: S) => SelectedState
) {
	return {
		/** The list of ids that represent selected rows */
		selectSelected: (state: S) => selectState(state)[name],
	};
}
