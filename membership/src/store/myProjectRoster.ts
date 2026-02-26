import { fetcher } from "@common";

import type { AppThunk } from ".";
import { setError } from ".";
import { selectMembersState } from "./members";

export type UpdateRosterOptions = {
	appendNew?: boolean;
	removeUnchanged?: boolean;
};

export const updateMyProjectRoster =
	(file: File, options: UpdateRosterOptions): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(setError("Unable to import roster", "Group not selected"));
			return;
		}
		const url = `/api/${groupName}/members/MyProjectRoster`;
		try {
			await fetcher.patchFile(url, file, options);
		} catch (error) {
			dispatch(setError("Unable to get file", error));
		}
	};
