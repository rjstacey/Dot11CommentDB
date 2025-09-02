import { fetcher } from "@common";
import { setError } from "@common";

import type { AppThunk } from ".";
import type {
	Destination,
	Content,
	Body,
	Message,
	Email,
} from "@schemas/email";
export type { Destination, Content, Body, Message, Email };

export const sendEmails =
	(groupName: string, emails: Email[]): AppThunk =>
	async (dispatch) => {
		const url = `/api/${groupName}/email/sendMany`;
		try {
			await fetcher.post(url, emails);
		} catch (error) {
			dispatch(setError("Unable to send emails: ", error));
		}
	};
