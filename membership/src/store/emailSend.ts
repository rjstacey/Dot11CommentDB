import { fetcher, setError } from "dot11-components";
import type { AppThunk } from ".";

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

export const sendEmail =
	(groupName: string, email: Email): AppThunk =>
	async (dispatch) => {
		const url = `/api/${groupName}/email/send`;
		try {
			for (let i = 0; i < 100; i++) await fetcher.post(url, email);
		} catch (error) {
			dispatch(setError("Unable to send email: ", error));
		}
	};
