import { fromIni } from "@aws-sdk/credential-providers";
import {
	SESClient,
	SendEmailCommand,
	SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import type { User } from "./users";
import type { Group } from "../schemas/groups";
import type {
	Email,
	EmailTemplate,
	EmailTemplateQuery,
	EmailTemplateCreate,
	EmailTemplateUpdate,
} from "../schemas/email";

import db from "../utils/database";

const region = "us-west-2";
let credentials: ReturnType<typeof fromIni>;
let sesClient: SESClient;

export function init() {
	if (process.env.NODE_ENV === "development")
		credentials = fromIni({ profile: "profile eb-cli" });

	sesClient = new SESClient({ region, credentials });
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
	const data = await sesClient.send(new SendEmailCommand(params));
	return data;
}

export function getTemplates(
	group: Group,
	constraints?: EmailTemplateQuery
): Promise<EmailTemplate[]> {
	let sql =
		"SELECT id, name, subject, body " +
		"FROM emailTemplates " +
		`WHERE groupId=UUID_TO_BIN(${db.escape(group.id)})`;

	if (constraints && "id" in constraints)
		sql += ` AND id IN (${db.escape(constraints.id)})`;

	return db.query<(RowDataPacket & EmailTemplate)[]>(sql);
}

async function addEmailTemplate(
	groupId: string,
	template: EmailTemplateCreate
) {
	const sql = db.format(
		"INSERT INTO emailTemplates SET groupId=UUID_TO_BIN(?), ?",
		[groupId, template]
	);
	const { insertId } = await db.query<ResultSetHeader>(sql);
	return insertId;
}

/**
 * Add email template
 */
export async function addTemplates(
	group: Group,
	templates: EmailTemplateCreate[]
) {
	const ids = await Promise.all(
		templates.map((t) => addEmailTemplate(group.id, t))
	);
	return getTemplates(group, { id: ids });
}

/** Update email template
 * @param groupId The group identifier to which the template belongs
 * @param id The template identifier
 * @param changes An object with the template changes
 */
async function updateTemplate(
	groupId: string,
	id: number,
	changes: Partial<EmailTemplate>
) {
	if (Object.keys(changes).length > 0) {
		const sql = db.format(
			"UPDATE emailTemplates SET ? WHERE groupId=UUID_TO_BIN(?) AND id=?",
			[changes, groupId, id]
		);
		await db.query(sql);
	}
	return changes.id || id;
}

/** Update email templates
 * @param group Group to which the templates belong
 * @param updates Array of email template updates
 */
export async function updateTemplates(
	group: Group,
	updates: EmailTemplateUpdate[]
) {
	const ids = await Promise.all(
		updates.map((u) => updateTemplate(group.id, u.id, u.changes))
	);
	return getTemplates(group, { id: ids });
}

/** Delete email templates
 * @param group Group to which the templates belong
 * @param ids Array of template identifiers
 */
export async function deleteTemplates(group: Group, ids: number[]) {
	const sql = db.format(
		"DELETE FROM emailTemplates WHERE groupId=UUID_TO_BIN(?) AND id IN(?)",
		[group.id, ids]
	);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}
