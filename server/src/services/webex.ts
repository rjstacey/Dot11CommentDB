import { DateTime } from "luxon";
import { Request } from "express";
import { NotFoundError } from "../utils/index.js";

import { WebexClient, WebexAuthParams } from "../utils/webexClient.js";
import type { User } from "./users.js";
import type {
	OAuthAccount,
	OAuthAccountCreate,
} from "@schemas/oauthAccounts.js";
import type {
	WebexMeeting,
	WebexMeetingCreate,
	WebexMeetingChange,
	WebexMeetingDelete,
	WebexAccountCreate,
	WebexAccountChange,
	WebexAccount,
	WebexAccountsQuery,
	WebexSites,
	WebexMeetingPreferences,
	WebexMeetingsQuery,
	WebexMeetingTemplate,
	WebexPerson,
} from "@schemas/webex.js";
import {
	genOAuthState,
	parseOAuthState,
	getOAuthAccounts,
	addOAuthAccount,
	updateOAuthAccount,
	deleteOAuthAccount,
	updateAuthParams,
} from "./oauthAccounts.js";
import { getSession } from "./sessions.js";

type WebexAccountLocal = Omit<
	WebexAccount,
	"authUrl" | "userName" | "displayName" | "lastAccessed"
> & {
	api: WebexClient;
};

const webexAuthRedirectPath = "/oauth2/webex";

/**  Webex accounts indexed by account ID. */
const webexAccounts: Record<number, WebexAccountLocal> = {};

const defaultTimezone = "America/New_York";

/**
 * Init routine, run at startup.
 */
export async function init() {
	WebexClient.init();
}

async function activateWebexAccount(id: number) {
	const account = webexAccounts[id];
	const api = account.api;
	account.owner = await getWebexAccountOwner(api);
	const sites = await getWebexMeetingPreferencesSites(api);
	let siteUrl: string | undefined;
	for (const site of sites) {
		if (site.default) siteUrl = site.siteUrl;
	}
	if (!siteUrl) siteUrl = sites[0]?.siteUrl;
	account.siteUrl = siteUrl;
	account.preferences = await getWebexMeetingPreferences(api, siteUrl);
	account.templates = await getWebexTemplates(api, siteUrl);
}

function createWebexAccount(oauthAccount: OAuthAccount) {
	const id = oauthAccount.id;
	let authParams: WebexAuthParams | null = null;
	if (oauthAccount.authParams)
		authParams = oauthAccount.authParams as WebexAuthParams;
	webexAccounts[id] = {
		...oauthAccount,
		api: new WebexClient(authParams, (...args) =>
			updateAuthParams(id, ...args)
		),
		//authParams: authParams,
		templates: [],
	};
	return webexAccounts[id];
}

/**
 * Delete Webex API.
 *
 * @param id Account identifier
 */
function removeWebexAccount(id: number) {
	delete webexAccounts[id];
}

/**
 * Get the URL for authorizing webex access
 *
 * @param user The user executing the request
 * @param host Hostname (from HTTP request)
 * @param id Webex account identifier
 * @returns The URL for authorizing Webex access
 */
function getAuthUrl(user: User, host: string, id: number) {
	const state = genOAuthState({ accountId: id, userId: user.SAPIN, host });
	const redirect_uri = host + webexAuthRedirectPath;
	return WebexClient.getAuthUrl(redirect_uri, state);
}

/**
 * Webex OAuth2 completion callback.
 * Completes mutual authentication; instantiates an API for accessing the Webex account
 * @params The parameters returned by the OAuth completion redirect
 */
export async function completeAuthWebexAccount({
	state = "",
	code = "",
}: {
	state?: string;
	code?: string;
}) {
	const stateObj = parseOAuthState(state);
	if (!stateObj) {
		console.warn("OAuth completion with bad state", state);
		return;
	}
	const { accountId, userId, host } = stateObj;

	let account = webexAccounts[accountId];
	if (!account) {
		const [oauthAccount] = await getOAuthAccounts({
			type: "webex",
			id: accountId,
		});
		if (!oauthAccount) return;
		account = createWebexAccount(oauthAccount);
	}

	await account.api.completeAuth(host + webexAuthRedirectPath, code, userId);

	// Activate this account
	await activateWebexAccount(accountId);
}

async function cleanWebexAccounts() {
	const oauthAccounts = await getOAuthAccounts({
		type: "webex",
	});
	const oauthIds = oauthAccounts.map((oauthAccount) => oauthAccount.id);

	for (const id of Object.keys(webexAccounts)) {
		if (!oauthIds.includes(Number(id))) delete webexAccounts[id];
	}
}

async function getActiveWebexAccounts(query?: WebexAccountsQuery) {
	const oauthAccounts = await getOAuthAccounts({
		...query,
		type: "webex",
	});

	const accountsOut: WebexAccountLocal[] = [];
	for (const oauthAccount of oauthAccounts) {
		const id = oauthAccount.id;
		let account = webexAccounts[id];
		if (!account) account = createWebexAccount(oauthAccount);
		// If the account is not yet activated, silently try to activate it
		if (!account.owner) {
			try {
				await activateWebexAccount(id);
			} catch (error) {
				console.warn(error);
			}
		}
		if (account.owner) accountsOut.push(account);
	}

	return accountsOut;
}

async function activatedWebexAccount(id: number) {
	const account = webexAccounts[id];
	if (account) return account;

	const [oauthAccount] = await getOAuthAccounts({
		id,
		type: "webex",
	});
	if (oauthAccount) {
		const account = createWebexAccount(oauthAccount);
		await activateWebexAccount(account.id);
		return account;
	}
	throw new NotFoundError(`Active Webex account (id=${id}) not found`);
}

export async function getWebexAccounts(
	req: Request,
	user: User,
	query?: WebexAccountsQuery
) {
	const proxyHost = req.headers["x-forwarded-host"] as string;
	const m = /(http[s]?:\/\/[^/]+)\//.exec(req.headers["referer"] || "");
	const host = m ? m[1] : proxyHost || req.headers.host || "";

	// Use "get" as a way to remove stale entries from the cache
	await cleanWebexAccounts();

	const oauthAccounts = await getOAuthAccounts({
		...query,
		type: "webex",
	});

	const accountsOut: WebexAccount[] = [];
	for (const oauthAccount of oauthAccounts) {
		const id = oauthAccount.id;
		let account = webexAccounts[id];
		if (!account) account = createWebexAccount(oauthAccount);

		// If the account is not yet activated, silently activate it
		if (!account.owner) {
			try {
				await activateWebexAccount(id);
			} catch (error) {
				console.warn(error);
			}
		}

		const { authParams, ...rest } = oauthAccount;
		const accountOut: WebexAccount = {
			...rest,
			authUrl: getAuthUrl(user, host, id),
			displayName: account.owner?.displayName,
			userName: account.owner?.userName,
			templates: account.templates,
			lastAccessed: account.api.lastAccess,
		};
		accountsOut.push(accountOut);
	}

	return accountsOut;
}

/**
 * Add a Webex account.
 * Just creates a database entry. Instatiation occurs following OAuth2 process.
 *
 * @param req Express request object
 * @param user The user executing the request
 * @param groupId The group identifier for the request
 * @param accountIn Expects a Webex account create object
 * @returns The Webex account object as added.
 */
export async function addWebexAccount(
	req: Request,
	user: User,
	groupId: string,
	accountIn: WebexAccountCreate
) {
	const oauthAccountIn: OAuthAccountCreate = {
		...accountIn,
		type: "webex",
		groupId,
	};
	const id = await addOAuthAccount(oauthAccountIn);
	const [account] = await getWebexAccounts(req, user, { id });
	return account;
}

/**
 * Update a Webex account.
 *
 * @param req Express request object
 * @param user The user executing the request
 * @param groupId The group identifier for the request
 * @param id The Webex account identifier.
 * @param changes Webex account change object.
 * @returns The Webex account object as updated.
 */
export async function updateWebexAccount(
	req: Request,
	user: User,
	groupId: string,
	id: number,
	changes: WebexAccountChange
) {
	const [oauthAccount] = await getOAuthAccounts({
		id,
		groupId,
		type: "webex",
	});
	if (!oauthAccount)
		throw new NotFoundError(`Webex account id=${id} not found`);
	await updateOAuthAccount(groupId, id, changes);
	const [account] = await getWebexAccounts(req, user, { id });
	return account;
}

/**
 * Delete a Webex account.
 * If an API has been instatiated, delete that too.
 *
 * @param id The Webex account identifier.
 * @returns The number of OAuth accounts deleted (0 or 1)
 */
export async function deleteWebexAccount(
	groupId: string,
	id: number
): Promise<number> {
	const affectedRows = await deleteOAuthAccount(groupId, id);
	removeWebexAccount(id);
	return affectedRows;
}

/**
 * Revoke calendar account authorization
 * @param req The express request
 * @param user User revoking authorization
 * @param groupId Working group identifier
 * @param id Calendar account identifier
 */
export async function revokeAuthWebexAccount(
	req: Request,
	user: User,
	groupId: string,
	id: number
) {
	const account = await activatedWebexAccount(id);
	if (account) await account.api.revokeAuth();

	const [accountOut] = await getWebexAccounts(req, user, { id });
	if (!accountOut)
		throw new NotFoundError(`Webex account id=${id} not found`);
	return accountOut;
}

async function getWebexAccountOwner(api: WebexClient) {
	const data = await api.get<WebexPerson>("/people/me");
	return data;
}

async function getWebexTemplates(api: WebexClient, siteUrl: string) {
	const url = "/meetings/templates";
	const params = {
		siteUrl,
		templateType: "meeting",
	};
	const data = await api.get<{ items: WebexMeetingTemplate[] }>(url, params);
	return data.items;
}

async function getWebexMeetingPreferencesSites(
	api: WebexClient
): Promise<WebexSites[]> {
	const url = "/meetingPreferences/sites";
	const data = await api.get<WebexMeetingPreferences>(url);
	return data.sites;
}

async function getWebexMeetingPreferences(
	api: WebexClient,
	siteUrl: string
): Promise<WebexMeetingPreferences> {
	return await api.get<WebexMeetingPreferences>("/meetingPreferences", {
		siteUrl,
	});
}

/**
 * Convert from webex meeting info to configurable parameters
 *
 * @param i - Webex meeting info
 * @returns Webex meeting configuration parameters
 */
export function webexMeetingToWebexMeetingParams(
	i: WebexMeeting
): WebexMeetingChange {
	const o = {
		accountId: i.accountId,
		id: i.id,
		title: i.title,
		start: i.start,
		end: i.end,
		timezone: i.timezone,
		password: i.password,
		enabledAutoRecordMeeting: i.enabledAutoRecordMeeting,
		enabledJoinBeforeHost: i.enabledJoinBeforeHost,
		joinBeforeHostMinutes: i.joinBeforeHostMinutes,
		enableConnectAudioBeforeHost: i.enableConnectAudioBeforeHost,
		publicMeeting: i.publicMeeting,
		meetingOptions: i.meetingOptions,
		audioConnectionOptions: i.audioConnectionOptions,
		integrationTags: i.integrationTags,
	};

	for (const key of Object.keys(o)) {
		if (typeof o[key] === "undefined") delete o[key];
	}

	return o;
}

/**
 * Get a list of Webex meetings.
 *
 * @param constraints Constraints object
 * @param constraints.groupId    Required. List meetings from Webex accounts associated with this groupId.
 * @param constraints.sessionsId If present, fromDate, toDate and timezone are obtained from session information.
 * @param constraints.fromDate   If present, Webex meetings scheduled on or after this date (ISO date string)
 * @param constraints.toDate     If present, Webex meetings scheduled before this date (ISO date string)
 * @param constraints.timezone   If present, return Webex meetings with schedule in timezone specified.
 * @param constraints.ids        If present, return Webex meetings with IDs in list.
 *
 * @returns An array of Webex meeting objects.
 */
export async function getWebexMeetings({
	groupId,
	sessionId,
	fromDate,
	toDate,
	timezone,
	ids,
}: WebexMeetingsQuery) {
	let to: DateTime, from: DateTime;
	if (sessionId) {
		const session = await getSession(Number(sessionId));
		if (!session)
			throw new NotFoundError(`Session id=${sessionId} not found`);
		if (!timezone) timezone = session.timezone || defaultTimezone;
		from = DateTime.fromISO(session.startDate, { zone: timezone });
		to = DateTime.fromISO(session.endDate, { zone: timezone }).plus({
			days: 1,
		});
	} else {
		if (!timezone) timezone = defaultTimezone;
		from = fromDate
			? DateTime.fromISO(fromDate, { zone: timezone })
			: DateTime.now().setZone(timezone);
		to = toDate
			? DateTime.fromISO(toDate, { zone: timezone }).plus({ days: 1 })
			: from.plus({ years: 1 });
	}
	const params = {
		meetingType: "scheduledMeeting",
		scheduledType: "meeting",
		from: from.toISO(),
		to: to.toISO(),
		max: 100,
	};

	let webexMeetings: WebexMeeting[] = [];
	const accounts = await getActiveWebexAccounts({ groupId });
	for (const account of accounts) {
		const api = account.api;
		const data = await api.get<{ items: WebexMeeting[] }>(
			"/meetings",
			params,
			{ headers: { timezone } }
		);
		//console.log(account.name, params, response.data.items.length)

		let meetings: WebexMeeting[] = data.items || [];
		meetings = meetings.map((m) => ({
			...m,
			groupId,
			accountId: account.id,
			accountName: account.name,
		}));
		webexMeetings = webexMeetings.concat(meetings);
	}

	// Looking for specific meetings
	if (ids) webexMeetings = webexMeetings.filter((m) => ids.includes(m.id));
	webexMeetings = webexMeetings.sort(
		(a, b) =>
			DateTime.fromISO(a.start).toMillis() -
			DateTime.fromISO(b.start).toMillis()
	);
	return webexMeetings;
}

type WebexMeetingResponse = Omit<WebexMeeting, "accountId" | "accountName">;

export async function getWebexMeeting(
	accountId: number,
	id: string,
	timezone?: string
): Promise<WebexMeeting> {
	const account = await activatedWebexAccount(accountId);
	const api = account.api;
	const config = timezone ? { headers: { timezone } } : undefined;
	const data = await api.get<WebexMeetingResponse>(
		`/meetings/${id}`,
		undefined,
		config
	);
	return {
		accountId,
		accountName: account.name,
		...data,
	};
}

/**
 * Add a Webex meeting.
 *
 * @param webexMeeting Webex meeting create object that includes:
 * @param webexMeeting.accountId Webex account ID.
 * @returns an object that is the Webex meeting as added.
 */
export async function addWebexMeeting({
	accountId,
	...params
}: WebexMeetingCreate): Promise<WebexMeeting> {
	const account = await activatedWebexAccount(accountId);
	const api = account.api;
	const siteUrl = account.siteUrl || "ieeesa.webex.com";
	const data = await api.post<WebexMeetingResponse>("/meetings", {
		siteUrl,
		...params,
	});
	return {
		accountId,
		accountName: account.name,
		...data,
	};
}

/**
 * Add Webex meetings.
 *
 * @param meetings Expects an array of Webex meeting create objects, throws otherwise.
 * @returns an array of Webex meeting objects as added.
 */
export async function addWebexMeetings(webexMeetings: WebexMeetingCreate[]) {
	// Make sure the account Ids are active
	await Promise.all(
		webexMeetings.map((m) => activatedWebexAccount(m.accountId))
	);
	return Promise.all(webexMeetings.map(addWebexMeeting));
}

/**
 * Update a Webex meeting.
 *
 * @param webexMeeting Webex meeting update object that also includes:
 * @param webexMeeting.accountId Webex account ID
 * @param webexMeeting.id Webex meeting ID
 *
 * @returns an object that is the Webex meeting as updated.
 */
export async function updateWebexMeeting({
	accountId,
	id,
	...params
}: WebexMeetingChange): Promise<WebexMeeting> {
	const account = await activatedWebexAccount(accountId);
	const api = account.api;
	const data = await api.patch<WebexMeetingResponse>(
		`/meetings/${id}`,
		params
	);
	return {
		accountId,
		accountName: account.name,
		...data,
	};
}

/**
 * Update Webex meetings.
 *
 * @param webexMeetings Expects an array of Webex meeting update objects, throws otherwise.
 * @returns an array of Webex meeting objects.
 */
export async function updateWebexMeetings(webexMeetings: WebexMeetingChange[]) {
	// Make sure the account Ids are active
	await Promise.all(
		webexMeetings.map((m) => activatedWebexAccount(m.accountId))
	);
	return Promise.all(webexMeetings.map(updateWebexMeeting));
}

/**
 * Delete a Webex meeting.
 *
 * @param webexMeeting that includes:
 * @param webexMeeting.accountId Webex account ID
 * @param webexMeeting.id Webex meeting ID
 */
export async function deleteWebexMeeting({
	accountId,
	id,
}: WebexMeetingDelete) {
	const account = await activatedWebexAccount(accountId);
	const api = account.api;
	return await api.delete(`/meetings/${id}`, { sendEmail: false });
}

/**
 * Delete Webex meetings.
 *
 * @param webexMeetings Expect an array of objects with shape {accountId, id}, throws otherwise
 * @returns the number of meetings deleted.
 */
export async function deleteWebexMeetings(webexMeetings: WebexMeetingDelete[]) {
	// Make sure the account Ids are active
	await Promise.all(
		webexMeetings.map((m) => activatedWebexAccount(m.accountId))
	);
	await Promise.all(webexMeetings.map(deleteWebexMeeting));
	return webexMeetings.length;
}
