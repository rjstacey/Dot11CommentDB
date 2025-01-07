import { fromIni } from "@aws-sdk/credential-providers";
import {
	SESClient,
	SESServiceException,
	SendEmailCommand,
	SendEmailCommandInput,
	SendEmailCommandOutput,
} from "@aws-sdk/client-ses";

import type { User } from "./users.js";
import type { Email } from "@schemas/email.js";

const region = "us-west-2";
let credentials: ReturnType<typeof fromIni>;
let sesClient: SESClient;

export function init() {
	if (process.env.NODE_ENV === "development")
		credentials = fromIni({ profile: "profile eb-cli" });

	sesClient = new SESClient({ region, credentials });
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send an email
 * @param user The user executing the command
 * @param email The email to be sent
 */
export async function sendEmail(user: User, email: Email) {
	if (!sesClient) throw new Error("eMail service has not been initialized");

	const params: SendEmailCommandInput = {
		...email,
		Source: "noreply@802tools.org",
	};
	let data: SendEmailCommandOutput;
	let maxRetries = 10;
	let delay = 10; // milliseconds
	while (true) {
		try {
			data = await sesClient.send(new SendEmailCommand(params));
			break;
		} catch (error: unknown) {
			if (
				error instanceof SESServiceException &&
				error.name === "Throttling" &&
				error.message === "Maximum sending rate exceeded." &&
				maxRetries-- > 0
			) {
				console.log("sleep " + delay);
				await sleep(delay);
				delay *= 2;
			} else {
				console.log(error);
				throw error;
			}
		}
	}
	return data;
}

/**
 * Send emails
 * @param user The user executing the command
 * @param emails An array of emails to be sent
 */
export async function sendEmails(user: User, emails: Email[]) {
	if (!sesClient) throw new Error("eMail service has not been initialized");

	return Promise.all(emails.map((email) => sendEmail(user, email)));
}
