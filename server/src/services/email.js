const {fromIni} = require("@aws-sdk/credential-providers");
const {SESClient, SendEmailCommand} = require("@aws-sdk/client-ses");

const region = 'us-west-2';
let credentials;
let sesClient;

export function init() {
	if (process.env.NODE_ENV === 'development')
		credentials = fromIni({profile: 'profile eb-cli'});

	sesClient = new SESClient({region, credentials});
}

// Set the parameters
const defaultParams = {
	Destination: {
		/* required */
		CcAddresses: [
			/* more items */
		],
		ToAddresses: [
			"rjstacey@gmail.com", //RECEIVER_ADDRESS
			/* more To-email addresses */
		],
	},
	Message: {
		/* required */
		Body: {
			/* required */
			Html: {
				Charset: "UTF-8",
				Data: "HTML_FORMAT_BODY",
			},
			Text: {
				Charset: "UTF-8",
				Data: "TEXT_FORMAT_BODY",
			},
		},
		Subject: {
			Charset: "UTF-8",
			Data: "EMAIL_SUBJECT",
		},
	},
	Source: "noreply@802tools.org", // SENDER_ADDRESS
	ReplyToAddresses: [
		/* more items */
	],
};

export async function sendEmail(user, email) {
	if (!sesClient)
		throw new Error('eMail service has not been initialized');

	const params = {
		...email,
		Source: "noreply@802tools.org",
	}
	const data = await sesClient.send(new SendEmailCommand(params));
	return data;
}
