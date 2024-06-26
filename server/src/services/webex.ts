import { DateTime } from "luxon";
import { URLSearchParams } from "url";
import { NotFoundError, isPlainObject } from "../utils";

import axios, { AxiosInstance } from "axios";
import { User } from "./users";

import {
	genOAuthState,
	parseOAuthState,
	getOAuthAccounts,
	addOAuthAccount,
	updateOAuthAccount,
	deleteOAuthAccount,
	updateAuthParams,
} from "./oauthAccounts";
import { OAuthAccount, OAuthAccountCreate } from "../schemas/oauthAccounts";
import { Request } from "express";
import { getSession } from "./sessions";
import {
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
} from "../schemas/webex";

type WebexAccountLocal = Omit<
	WebexAccount,
	"authUrl" | "userName" | "displayName"
> & {
	axios?: AxiosInstance;
	authParams: Record<string, any> | null;
};

const webexApiBaseUrl = "https://webexapis.com/v1";
const webexAuthUrl = "https://webexapis.com/v1/authorize";
const webexTokenUrl = "https://webexapis.com/v1/access_token";

const webexAuthScope = [
	"spark:kms",
	"spark:all",
	"meeting:controls_read",
	"meeting:controls_write",
	"meeting:schedules_read",
	"meeting:schedules_write",
	"meeting:participants_read",
	"meeting:participants_write",
	"meeting:preferences_write",
	"meeting:preferences_read",
].join(" ");

/* const webexAuthRedirectUri = process.env.NODE_ENV === 'development'?
	'http://localhost:3000/oauth2/webex':
	'https://802tools.org/oauth2/webex';*/

const webexAuthRedirectPath = "/oauth2/webex";

/**  Webex accounts indexed by account ID. */
const webexAccounts: Record<number, WebexAccountLocal> = {};

const defaultTimezone = "America/New_York";
let webexClientId: string;
let webexClientSecret: string;

type WebexAuthParams = {
	access_token: string;
	refresh_token: string;
};

// Add refresh_token to the Axios request config object
declare module "axios" {
	export interface AxiosRequestConfig {
		refresh_token?: string;
	}
}

/**
 * Create Webex API.
 *
 * @param id Account identifier
 * @param authParams Object containing the access and refresh tokens
 *
 * Instantiate an Axios instance to access a Webex account.
 * Create a response interceptor that will reaquire a token if the current token expires.
 * Keep the accounts database updated with the current tokens.
 */
function createWebexApi(id: number, authParams: WebexAuthParams) {
	// Create axios instance with appropriate defaults
	const api = axios.create({
		headers: {
			Authorization: `Bearer ${authParams.access_token}`,
			Accept: "application/json",
			Timezone: defaultTimezone,
		},
		baseURL: webexApiBaseUrl,
		refresh_token: authParams.refresh_token,
	});

	if (process.env.NODE_ENV === "development") {
		api.interceptors.request.use((config) => {
			console.log(id, config.method, config.url);
			if (config.data) console.log("data=", config.data);
			return config;
		});
	}

	// Add a response interceptor
	api.interceptors.response.use(
		(response) => {
			const account = getWebexAccount(id);
			account.lastAccessed = new Date().toISOString();
			return response;
		},
		async (error) => {
			if (error.response && error.response.status === 401) {
				// If we get 'Unauthorized' then refresh the access token
				console.log("unauthorized");
				const request = error.config;
				const params = {
					grant_type: "refresh_token",
					client_id: webexClientId,
					client_secret: webexClientSecret,
					refresh_token: api.defaults.refresh_token,
				};
				const response = await axios.post(webexTokenUrl, params);
				const authParams = response.data;
				await updateAuthParams(id, authParams);
				api.defaults.refresh_token = authParams.refresh_token;
				api.defaults.headers[
					"Authorization"
				] = `Bearer ${authParams.access_token}`;

				// Resubmit request with updated access token
				request.headers["Authorization"] =
					api.defaults.headers["Authorization"];
				return axios(request);
			}
			return Promise.reject(error);
		}
	);

	return api;
}

function activateWebexAccount(id: number, authParams: WebexAuthParams) {
	const account = webexAccounts[id];
	account.authParams = authParams;
	account.axios = createWebexApi(account.id, authParams);
	getWebexAccountOwner(id)
		.then((owner) => {
			account.owner = owner;
		})
		.catch((error) => console.warn(`getWebexAccountOwner(${id})`, error));
	getWebexMeetingPreferencesSites(id)
		.then((sites) => {
			let siteUrl: string | undefined;
			for (const site of sites) {
				if (site.default) siteUrl = site.siteUrl;
			}
			if (!siteUrl) siteUrl = sites[0]?.siteUrl;
			account.siteUrl = siteUrl;
			getWebexMeetingPreferences(id)
				.then((preferences) => {
					account.preferences = preferences;
				})
				.catch((error) =>
					console.warn(`getWebexMeetingPreferences(${id})`, error)
				);
			getWebexTemplates(id)
				.then((templates) => {
					account.templates = templates;
				})
				.catch((error) =>
					console.warn(`getWebexTemplates(${id})`, error)
				);
		})
		.catch((error) => console.warn(error));
}

function createWebexAccount(account: OAuthAccount) {
	const id = account.id;
	webexAccounts[id] = {
		...account,
		templates: [],
		lastAccessed: null,
	};
	if (account.authParams)
		activateWebexAccount(id, account.authParams as WebexAuthParams);
}

export function getWebexAccount(id: number) {
	const account = webexAccounts[id];
	if (!account) throw new NotFoundError(`Invalid account id=${id}`);
	return account;
}

function getWebexAccountsLocal(constraints?: WebexAccountsQuery) {
	let accounts = Object.values(webexAccounts).filter(
		(account) => account.axios
	);
	if (constraints) {
		if (constraints.groupId) {
			accounts = accounts.filter(
				(account) => account.groupId === constraints.groupId
			);
		}
		if (constraints.id) {
			accounts = accounts.filter(
				(account) => account.id === constraints.id
			);
		}
		if (constraints.isActive) {
			accounts = accounts.filter((account) => account.axios);
		}
	}
	return accounts;
}

function getWebexAccountApi(id: number) {
	const api = getWebexAccount(id).axios;
	if (!api) throw new TypeError(`Inactive Webex account id=${id}`);
	return api;
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
 * Init routine, run at startup.
 *
 * Instantiate an API for each of the configured Webex accounts.
 */
export async function init() {
	if (process.env.WEBEX_CLIENT_ID)
		webexClientId = process.env.WEBEX_CLIENT_ID;
	else console.warn("Webex API: Missing .env variable WEBEX_CLIENT_ID");

	if (process.env.WEBEX_CLIENT_SECRET)
		webexClientSecret = process.env.WEBEX_CLIENT_SECRET;
	else console.warn("Webex API: Missing .env variable WEBEX_CLIENT_SECRET");

	// Cache the active webex accounts and create an axios api for each
	const accounts = await getOAuthAccounts({ type: "webex" });
	accounts.forEach(createWebexAccount);
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
	return (
		webexAuthUrl +
		"?" +
		new URLSearchParams({
			client_id: webexClientId,
			response_type: "code",
			scope: webexAuthScope,
			redirect_uri: host + webexAuthRedirectPath,
			state: genOAuthState({ accountId: id, userId: user.SAPIN, host }),
		})
	);
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
	console.log(`webex auth completion, accountId=${accountId}`);

	let params = {
		grant_type: "authorization_code",
		client_id: webexClientId,
		client_secret: webexClientSecret,
		code: code,
		redirect_uri: host + webexAuthRedirectPath,
	};

	const response = await axios.post(webexTokenUrl, params);
	const authParams = response.data as WebexAuthParams;
	await updateAuthParams(accountId, authParams, userId);

	// Activate axios instance for this account
	activateWebexAccount(accountId, authParams);
}

export async function getWebexAccounts(
	req: Request,
	user: User,
	constraints?: WebexAccountsQuery
) {
	const accounts = getWebexAccountsLocal(constraints);
	const accountsOut: WebexAccount[] = accounts.map((account) => {
		const { authParams, axios, ...rest } = account;
		const accountOut: WebexAccount = {
			...rest,
			authUrl: getAuthUrl(user, req.hostname, account.id),
			displayName: rest.owner?.displayName,
			userName: rest.owner?.userName,
		};
		return accountOut;
	});
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
	if (!isPlainObject(accountIn))
		throw new TypeError(
			"Bad body; expected calendar account create object"
		);
	let oauthAccount: OAuthAccountCreate = {
		...accountIn,
		type: "webex",
		groupId,
	};
	const id = await addOAuthAccount(oauthAccount);
	const [account] = await getOAuthAccounts({ id });
	createWebexAccount(account);
	const accounts = await getWebexAccounts(req, user, { id: account.id });
	return accounts[0];
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
	if (!id) throw new TypeError("Must provide id with update");
	await updateOAuthAccount(groupId, id, changes);
	let account = getWebexAccountsLocal({ id })[0];
	if (changes.name) account.name = changes.name;
	const accounts = await getWebexAccounts(req, user, { id: account.id });
	return accounts[0];
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

/*
 * Handle Webex API error.
 *
 * @error:object 	The error object returned by the Axios instance.
 */
function webexApiError(error: any) {
	const { response } = error;
	if (response && response.status >= 400 && response.status < 500) {
		const { message, errors } = response.data;
		console.error(message, errors);
		if (response.status === 404)
			throw new NotFoundError("Webex meeting not found");
		const description = `${message}\n` + errors.join("\n");
		throw new Error(`Webex API error ${response.status}: ${description}`);
	}
	throw new Error(error);
}

async function getWebexAccountOwner(id: number) {
	const api = getWebexAccountApi(id);
	return api
		.get("/people/me")
		.then((response) => response.data)
		.catch(webexApiError);
}

async function getWebexTemplates(id: number) {
	const siteUrl = getWebexAccount(id)?.siteUrl;
	const api = getWebexAccountApi(id);
	return api
		.get("/meetings/templates", {
			params: { siteUrl, templateType: "meeting" },
		})
		.then((response) => response.data.items)
		.catch(webexApiError);
}

function getWebexMeetingPreferencesSites(id: number): Promise<WebexSites[]> {
	const api = getWebexAccountApi(id);
	let url = "/meetingPreferences/sites";
	return api
		.get(url)
		.then((response) => response.data.sites)
		.catch(webexApiError);
}

function setWebexDefaultSite(id: number, siteUrl: string) {
	const api = getWebexAccountApi(id);
	let url = "/meetingPreferences/sites?defaultSite=true";
	return api
		.put(url, { siteUrl })
		.then((response) => response.data)
		.catch(webexApiError);
}

function getWebexMeetingPreferences(
	id: number
): Promise<WebexMeetingPreferences> {
	const account = getWebexAccount(id);
	let url = "/meetingPreferences";
	if (account.siteUrl)
		url += "?" + new URLSearchParams({ siteUrl: account.siteUrl });
	return account
		.axios!.get(url)
		.then((response) => response.data)
		.catch(webexApiError);
}

/**
 * Convert from webex meeting info to confiurable parameters
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
	const accounts = getWebexAccountsLocal({ groupId, isActive: true });
	for (const account of accounts) {
		const api = getWebexAccountApi(account.id);

		const response = await api
			.get("/meetings", { params, headers: { timezone } })
			.catch(webexApiError);
		//console.log(account.name, params, response.data.items.length)

		let meetings: WebexMeeting[] = response?.data.items || [];
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

export async function getWebexMeeting(
	accountId: number,
	id: string,
	timezone?: string
): Promise<WebexMeeting> {
	const api = getWebexAccountApi(accountId);
	const config = timezone ? { headers: { timezone } } : undefined;
	return api
		.get(`/meetings/${id}`, config)
		.then((response) => response.data)
		.catch(webexApiError);
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
	const account = getWebexAccount(accountId);
	const siteUrl = account.siteUrl || "ieeesa.webex.com";
	const api = getWebexAccountApi(accountId);
	return api
		.post("/meetings", { siteUrl, ...params })
		.then((response) => ({
			accountId,
			accountName: account.name,
			...response.data,
		}))
		.catch(webexApiError);
}

/**
 * Add Webex meetings.
 *
 * @param meetings Expects an array of Webex meeting create objects, throws otherwise.
 * @returns an array of Webex meeting objects as added.
 */
export async function addWebexMeetings(webexMeetings: WebexMeetingCreate[]) {
	// Make sure the account Ids are active
	webexMeetings.forEach((m) => getWebexAccountApi(m.accountId));
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
	const account = getWebexAccount(accountId);
	const api = getWebexAccountApi(accountId);
	return api
		.patch(`/meetings/${id}`, params)
		.then((response) => ({
			accountId,
			accountName: account.name,
			...response.data,
		}))
		.catch(webexApiError);
}

/**
 * Update Webex meetings.
 *
 * @param webexMeetings Expects an array of Webex meeting update objects, throws otherwise.
 * @returns an array of Webex meeting objects.
 */
export async function updateWebexMeetings(webexMeetings: WebexMeetingChange[]) {
	// Make sure the account Ids are active
	webexMeetings.forEach((m) => getWebexAccountApi(m.accountId));
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
	const api = getWebexAccountApi(accountId);
	return api
		.delete(`/meetings/${id}`)
		.then((response) => response.data)
		.catch(webexApiError);
}

/**
 * Delete Webex meetings.
 *
 * @param webexMeetings Expect an array of objects with shape {accountId, id}, throws otherwise
 * @returns the number of meetings deleted.
 */
export async function deleteWebexMeetings(webexMeetings: WebexMeetingDelete[]) {
	// Make sure the account Ids are active
	webexMeetings.forEach((m) => getWebexAccountApi(m.accountId));
	await Promise.all(webexMeetings.map(deleteWebexMeeting));
	return webexMeetings.length;
}
