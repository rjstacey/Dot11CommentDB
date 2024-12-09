import { fetcher, setError } from "dot11-components";
import type { AppThunk } from ".";
import type {
	Destination,
	Content,
	Body,
	Message,
	Email,
} from "@schemas/email";
export type { Destination, Content, Body, Message, Email };

/*
export interface Destination {
	ToAddresses?: string[];
	CcAddresses?: string[];
	BccAddresses?: string[];
}

export interface Content {
	Data: string | undefined;
	Charset?: string;
}

export interface Body {
	Text?: Content;
	Html?: Content;
}

export interface Message {
	Subject: Content | undefined;
	Body: Body | undefined;
}

export interface Email {
	Destination: Destination | undefined;
	Message: Message | undefined;
	ReplyToAddresses?: string[];
}
*/
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
