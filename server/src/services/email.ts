import { fromIni } from '@aws-sdk/credential-providers';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import type { ResultSetHeader } from 'mysql2';

import type { User } from './users';
import type { Group } from './groups';

import db from '../utils/database';
import { isPlainObject } from '../utils';

const region = 'us-west-2';
let credentials: ReturnType<typeof fromIni>;
let sesClient: SESClient;

export function init() {
	if (process.env.NODE_ENV === 'development')
		credentials = fromIni({profile: 'profile eb-cli'});

	sesClient = new SESClient({region, credentials});
}

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

function validOptionalStringArray(s: any): s is (string[] | undefined) {
	return typeof s === "undefined" ||
		(Array.isArray(s) && s.every((s: any) => typeof s === "string"));
}

function validContent(content: any): content is Content {
	return isPlainObject(content) &&
		(typeof content.Data === "undefined" || typeof content.Data === "string") &&
		(typeof content.Charset === "undefined" || typeof content.Charset === "string")
}

function validDestination(destintation: any): destintation is Destination {
	return isPlainObject(destintation) &&
		validOptionalStringArray(destintation.ToAddresses) &&
		validOptionalStringArray(destintation.CcAddresses) &&
		validOptionalStringArray(destintation.BccAddresses)
}

function validBody(body: any): body is Body {
	return isPlainObject(body) &&
		validContent(body.Text) &&
		validContent(body.Html);
}

function validMessage(message: any): message is Message {
	return isPlainObject(message) &&
		validContent(message.Subject) &&
		validBody(message.Body)
}

export function validateEmail(email: any): asserts email is Email {
	if (!isPlainObject(email))
		throw new TypeError("expected email object");
	if (!validDestination(email.Destination))
		throw new TypeError("invalid email object; bad Destination");
	if (!validMessage(email.Message))
		throw new TypeError("invalid email object; bad Message");
	if (!validOptionalStringArray(email.ReplyToAddresses))
		throw new TypeError("invalid email object; bad ReplyToAddresses");
}

/**
 * Send an email
 * @param user The user executing the command
 * @param email The email to be sent
 */
export async function sendEmail(user: User, email: Email) {
	if (!sesClient)
		throw new Error('eMail service has not been initialized');

	const params: SendEmailCommandInput = {
		...email,
		Source: "noreply@802tools.org",
	}
	const data = await sesClient.send(new SendEmailCommand(params));
	return data;
}

type EmailTemplate = {
	id: number;
	name: string;
	subject: string;
	body: string;
};

type EmailTemplateConstraints = {
	id: number | number[];
}

export async function getTemplates(group: Group, constraints?: EmailTemplateConstraints) {
	let sql = db.format(`
		SELECT id, name, subject, body
		FROM emailTemplates
		WHERE groupId=UUID_TO_BIN(?)
	`, [group.id]);

	if (constraints && 'id' in constraints)
		sql += db.format('AND id IN (?)', [constraints.id]);

	const templates = await db.query(sql) as EmailTemplate[];
	return templates;
}

type EmailTemplateCreate = Omit<EmailTemplate, "id">;

function validEmailTemplateCreate(template: any): template is EmailTemplateCreate {
	return (
		isPlainObject(template) &&
		(typeof template.subject === 'undefined' || typeof template.subject === 'string') &&
		(typeof template.body === 'undefined' || typeof template.body === 'string')
	)
}

export function validEmailTemplateCreates(templates: any): templates is EmailTemplateCreate[] {
	return Array.isArray(templates) && templates.every(validEmailTemplateCreate);
}

async function addEmailTemplate(groupId: string, template: EmailTemplateCreate) {
	const sql = db.format(`
		INSERT INTO emailTemplates SET groupId=UUID_TO_BIN(?), ? 
	`, [groupId, template]);
	const {insertId} = await db.query(sql) as ResultSetHeader;
	return insertId;
}

/**
 * Add email template
 */
export async function addTemplates(group: Group, templates: EmailTemplateCreate[]) {
	const ids = await Promise.all(templates.map(t => addEmailTemplate(group.id, t)));
	return getTemplates(group, {id: ids});
}

type EmailTemplateUpdate = {
	id: number;
	changes: Partial<EmailTemplate>;
}

function validEmailTemplateChanges(changes: any): changes is Partial<EmailTemplate> {
	return (
		isPlainObject(changes) &&
		(typeof changes.subject === 'undefined' || typeof changes.subject === 'string') &&
		(typeof changes.body === 'undefined' || typeof changes.body === 'string')
	)
}

function validEmailTemplateUpdate(update: any): update is EmailTemplateUpdate {
	return (
		isPlainObject(update) &&
		typeof update.id === 'number' &&
		validEmailTemplateChanges(update.changes)
	)
}

export function validEmailTemplateUpdates(updates: any): updates is EmailTemplateUpdate[] {
	return Array.isArray(updates) && updates.every(validEmailTemplateUpdate);
}

/** Update email template
 * @param groupId The group identifier to which the template belongs
 * @param id The template identifier
 * @param changes An object with the template changes
 */
async function updateTemplate(groupId: string, id: number, changes: Partial<EmailTemplate>) {
	if (Object.keys(changes).length > 0) {
		const sql = db.format(`
			UPDATE emailTemplates SET ? WHERE groupId=UUID_TO_BIN(?) AND id=?
		`, [changes, groupId, id]);
		await db.query(sql);
	}
	return changes.id || id;
}

/** Update email templates
 * @param group Group to which the templates belong
 * @param updates Array of email template updates
 */
export async function updateTemplates(group: Group, updates: EmailTemplateUpdate[]) {
	const ids = await Promise.all(updates.map(u => updateTemplate(group.id, u.id, u.changes)));
	return getTemplates(group, {id: ids});
}

export function validEmailTemplateIds(ids: any): ids is number[] {
	return Array.isArray(ids) && ids.every(id => typeof id === 'number');
}

/** Delete email templates
 * @param group Group to which the templates belong
 * @param ids Array of template identifiers
 */
export async function deleteTemplates(group: Group, ids: number[]) {
	const sql = db.format(`
		DELETE FROM emailTemplates WHERE groupId=UUID_TO_BIN(?) AND id IN(?)
	`, [group.id, ids]);
	const {affectedRows} = await db.query(sql) as ResultSetHeader;
	return affectedRows;
}