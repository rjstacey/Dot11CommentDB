import { fromIni } from "@aws-sdk/credential-providers";
import {
	SESClient,
	SESServiceException,
	SendEmailCommand,
	SendEmailCommandInput,
	SendEmailCommandOutput,
} from "@aws-sdk/client-ses";

import type { Email } from "@schemas/email.js";

const region = "us-west-2";
let credentials: ReturnType<typeof fromIni>;
let sesClient: SESClient;

export function init() {
	if (process.env.NODE_ENV === "development")
		credentials = fromIni({ profile: "eb-cli" });

	sesClient = new SESClient({
		region,
		credentials,
		retryMode: "adaptive",
		maxAttempts: 10,
	});
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send an email
 * @param user The user executing the command
 * @param email The email to be sent
 */
export async function sendEmail(email: Email) {
	if (!sesClient) throw new Error("eMail service has not been initialized");

	const params: SendEmailCommandInput = {
		...email,
		Source: "noreply@802tools.org",
	};
	let output: SendEmailCommandOutput;
	let maxRetries = 10;
	let delay = 10; // milliseconds
	while (true) {
		try {
			output = await sesClient.send(new SendEmailCommand(params));
			break;
		} catch (error: unknown) {
			if (
				error instanceof SESServiceException &&
				error.name === "Throttling" &&
				maxRetries-- > 0
			) {
				await sleep(delay);
				delay *= 2;
			} else {
				throw error;
			}
		}
	}
	return output;
}

/**
 * Send emails
 * @param user The user executing the command
 * @param emails An array of emails to be sent
 */
export async function sendEmails(emails: Email[]) {
	if (!sesClient) throw new Error("eMail service has not been initialized");

	let output: SendEmailCommandOutput[] = [];
	while (emails.length > 0) {
		const toSend = emails.splice(0, 10);
		const o = await Promise.all(toSend.map(sendEmail));
		output = output.concat(o);
	}
	return output;
}
