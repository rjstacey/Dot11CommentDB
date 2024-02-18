import { DateTime } from 'luxon';
import { URLSearchParams } from 'url';
import { NotFoundError, isPlainObject } from '../utils';

import axios, { AxiosInstance } from 'axios';
import { User } from './users';

import {
	genOAuthState,
	parseOAuthState,
	getOAuthAccounts,
	getOAuthParams,
	validOAuthAccountChanges,
	addOAuthAccount,
	updateOAuthAccount,
	deleteOAuthAccount,
	updateAuthParams,
	OAuthAccount,
	OAuthAccountCreate
} from './oauthAccounts';
import { Request } from 'express';
import { getSession } from './sessions';

type WebexPerson = {
	id: string;
	emails: string[];
	phoneNumbers: object[];
	displayName: string;
	orgId: string;
}

type WebexAudioPreferences = {
	defaultAudioType: "webexAudio" | "voipOnly" | "otherTeleconferenceService" | "none";
	otherTeleconferenceDescription: string;
	enabledGlobalCallIn: boolean;
	enabledAutoConnection: boolean;
	audioPin: string;
	officeNumber: any;
	mobileNumber: any;
}

type WebexSchedulingOptions = {
	enabledJoinBeforeHost: boolean;
	joinBeforeHostMinutes: number;
	enabledAutoShareRecording: boolean;
}

type WebexMeetingPreferences = {
	audio: WebexAudioPreferences;
	schedulingOptions: WebexSchedulingOptions;
	sites: any;
	personalMeetingRoom: any;
}

type WebexAccount = OAuthAccount & {
	authUrl: string;
	templates: any[];
	owner?: WebexPerson;
	preferences?: WebexMeetingPreferences;
	displayName?: string;
	userName?: string;
}

const webexApiBaseUrl = 'https://webexapis.com/v1';
const webexAuthUrl = 'https://webexapis.com/v1/authorize';
const webexTokenUrl = 'https://webexapis.com/v1/access_token';

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
	"meeting:preferences_read"
].join(' ');

/* const webexAuthRedirectUri = process.env.NODE_ENV === 'development'?
	'http://localhost:3000/oauth2/webex':
	'https://802tools.org/oauth2/webex';*/

const webexAuthRedirectPath = "/oauth2/webex";

/**  Webex account APIs indexed by account ID. */
const apis: Record<number, AxiosInstance> = {};

const defaultTimezone = 'America/New_York';
let webexClientId: string;
let webexClientSecret: string;

function getWebexApi(id: number) {
	const api = apis[id];
	if (!api)
		throw new TypeError(`Invalid account id=${id}`);
	return api;
}

function hasWebexApi(id: number) {
	return !!apis[id];
}

type WebexAuthParams = {
	access_token: string;
	refresh_token: string;
}

// Add refresh_token to the Axios request config object
declare module 'axios' {
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
			'Authorization': `Bearer ${authParams.access_token}`,
			'Accept': 'application/json',
			'Timezone': defaultTimezone
		},
		baseURL: webexApiBaseUrl,
		refresh_token: authParams.refresh_token
	});

	/*if (process.env.NODE_ENV === 'development') {
		api.interceptors.request.use(
			config => {
				console.log(id, config.method, config.url)
				if (config.data)
					console.log('data=', config.data)
				return config;
			}
		);
	}*/

	// Add a response interceptor
	api.interceptors.response.use(
		(response) => response, 
		async (error) => {
			if (error.response && error.response.status === 401) {
				// If we get 'Unauthorized' then refresh the access token
				console.log('unauthorized')
				const request = error.config;
				const params = {
					grant_type: 'refresh_token',
					client_id: webexClientId,
					client_secret: webexClientSecret,
					refresh_token: api.defaults.refresh_token,
				};
				const response = await axios.post(webexTokenUrl, params);
				const authParams = response.data;
				await updateAuthParams(id, authParams);
				api.defaults.refresh_token = authParams.refresh_token;
				api.defaults.headers['Authorization'] = `Bearer ${authParams.access_token}`;

				// Resubmit request with updated access token
				request.headers['Authorization'] = api.defaults.headers['Authorization'];
				return axios(request);
			}
			return Promise.reject(error);
		}
	);

	apis[id] = api;
}

/**
 * Delete Webex API.
 * 
 * @param id Account identifier
 */
function deleteWebexApi(id: number) {
	delete apis[id];
}

/**
 * Init routine, run at startup.
 *
 * Instantiate an API for each of the configured Webex accounts.
 */
export async function init() {

	if (process.env.WEBEX_CLIENT_ID)
		webexClientId = process.env.WEBEX_CLIENT_ID;
	else
		console.warn("Webex API: Missing .env variable WEBEX_CLIENT_ID");

	if (process.env.WEBEX_CLIENT_SECRET)
		webexClientSecret = process.env.WEBEX_CLIENT_SECRET;
	else
		console.warn("Webex API: Missing .env variable WEBEX_CLIENT_SECRET");

	// Cache the active webex accounts and create an axios api for each
	const accounts = await getOAuthParams({type: "webex"});
	for (const account of accounts) {
		const {id, authParams} = account;
		if (authParams) {
			// Create and axios api for this account
			createWebexApi(id, authParams as WebexAuthParams);
		}
	}
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
	return webexAuthUrl +
		'?' + new URLSearchParams({
				client_id: webexClientId,
				response_type: 'code',
				scope: webexAuthScope,
				redirect_uri: host + webexAuthRedirectPath,
				state: genOAuthState({accountId: id, userId: user.SAPIN, host}),
			});
}

/**
 * Webex OAuth2 completion callback.
 * Completes mutual authentication; instantiates an API for accessing the Webex account
 * @params The parameters returned by the OAuth completion redirect
 */
export async function completeAuthWebexAccount({
	state = '',
	code = ''
}: {
	state?: string,
	code?: string
}) {
	const stateObj = parseOAuthState(state);
	if (!stateObj) {
		console.warn('OAuth completion with bad state', state);
		return;
	}
	const {accountId, userId, host} = stateObj;
	console.log(`webex auth completion, accountId=${accountId}`)

	let params = {
		grant_type: 'authorization_code',
		client_id: webexClientId,
		client_secret: webexClientSecret,
		code: code,
		redirect_uri: host + webexAuthRedirectPath
	};

	const response = await axios.post(webexTokenUrl, params);
	const authParams = response.data as WebexAuthParams;

	await updateAuthParams(accountId, authParams, userId);

	// Create an axios instance for this account
	createWebexApi(accountId, authParams);
}

export async function getWebexAccounts(
	req: Request,
	user: User,
	constraints?: {
		id?: number | number[];
		name?: string | string[];
		groupId?: string | string[];
	}
) {
	const accountsDB = await getOAuthAccounts({type: "webex", ...constraints});
	const p: Promise<any>[] = [];
	const accounts = accountsDB.map(accountDB => {
		console.log(req.headers.referer)
		const m = /(https{0,1}:\/\/[^\/]+)/i.exec(req.headers.referer || '');
		const host = m? m[1]: '';
		console.log(host)
		const account: WebexAccount = {
			...accountDB,
			authUrl: getAuthUrl(user, host, accountDB.id),
			templates: [],
		};
		if (hasWebexApi(account.id)) {
			p.push(
				getWebexAccountOwner(account.id)
					.then((owner) => {
						account.owner = owner;
						account.displayName = owner.displayName;
						account.userName = owner.userName;
					})
					.catch(error => console.warn(error))
			)
			p.push(
				getWebexTemplates(account.id)
					.then((templates) => {
						account.templates = templates;
					})
					.catch(error => console.warn(error))
			);
			p.push(
				getWebexMeetingPreferences(account.id)
					.then((preferences) => {
						account.preferences = preferences;
					})
					.catch(error => console.warn(error))
			);
		}
		return account;
	});
	await Promise.all(p);

	return accounts;
}

export async function getWebexAccount(id: number): Promise<OAuthAccount | undefined> {
	const [account] = await getOAuthAccounts({id, type: "webex"});
	return account;
}

/**
 * Add a Webex account.
 * Just creates a database entry. Instatiation occurs following OAuth2 process.
 *
 * @param req Express request object
 * @param user The user executing the request
 * @param groupId The group identifier for the request
 * @param accountIn Expects an OAuth account create object, throws otherwise.
 * @returns The Webex account object as added.
 */
export async function addWebexAccount(req: Request, user: User, groupId: string, accountIn: any) {
	if (!isPlainObject(accountIn))
		throw new TypeError("Bad body; expected calendar account create object");
	let account: OAuthAccountCreate = {
		name: '',
		...(accountIn as object),
		type: "webex",
		groupId
	}
	const id = await addOAuthAccount(account);
	const [updatedAccount] = await getWebexAccounts(req, user, {id});
	return updatedAccount;
}

/**
 * Update a Webex account.
 *
 * @param req Express request object
 * @param user The user executing the request
 * @param groupId The group identifier for the request
 * @param id The Webex account identifier.
 * @param changes Expects an OAuth account update object, throws otherwise.
 * @returns The Webex account object as added.
 */
export async function updateWebexAccount(req: Request, user: User, groupId: string, id: number, changes: any) {
	if (!id)
		throw new TypeError('Must provide id with update');
	if (!validOAuthAccountChanges(changes))
		throw new TypeError("Bad body; expected calendar account changes object");
	await updateOAuthAccount(groupId, id, changes);
	const [account] = await getWebexAccounts(req, user, {id});
	return account;
}

/**
 * Delete a Webex account.
 * If an API has been instatiated, delete that too.
 *
 * @param id The Webex account identifier.
 * @returns The number of OAuth accounts deleted (0 or 1)
 */
export async function deleteWebexAccount(groupId: string, id: number): Promise<number> {
	const affectedRows = await deleteOAuthAccount(groupId, id);
	deleteWebexApi(id);
	return affectedRows;
}

/*
 * Handle Webex API error.
 *
 * @error:object 	The error object returned by the Axios instance.
 */
function webexApiError(error: any) {
	const {response} = error;
	if (response && response.status >= 400 && response.status < 500) {
		const {message, errors} = response.data;
		console.error(message, errors);
		if (response.status === 404)
			throw new NotFoundError('Webex meeting not found');
		const description = `${message}\n` + errors.join('\n');
		throw new Error(`Webex API error ${response.status}: ${description}`);
	}
	throw new Error(error);
}

async function getWebexAccountOwner(id: number) {
	const api = getWebexApi(id);
	return api.get('/people/me')
		.then(response => response.data)
		.catch(webexApiError);
}

async function getWebexTemplates(id: number) {
	const api = getWebexApi(id);
	return api.get('/meetings/templates', {params: {templateType: "meeting"}})
		.then(response => response.data.items)
		.catch(webexApiError);
}

function getWebexMeetingPreferences(id: number) {
	const api = getWebexApi(id);
	return api.get('/meetingPreferences')
		.then(response => response.data)
		.catch(webexApiError);
}

export type WebexMeetingAlways = {
	accountId: number;
	accountName?: string;
}

export type WebexMeetingOptions = {
	/** Whether or not to allow any attendee to chat in the meeting. 
	 *  Also depends on the session type. */
	enabledChat?: boolean;
	/** Whether or not to allow any attendee to have video in the meeting. 
	 *  Also depends on the session type. */
	enabledVideo?: boolean;
	/** Whether or not to allow any attendee to poll in the meeting. 
	 *  Can only be set true for a webinar. */
	enabledPolling?: boolean;
	/** Whether or not to allow any attendee to take notes in the meeting. 
	 *  The value of this attribute also depends on the session type. */
	enabledNote?: boolean;
	/** Whether note taking is enabled. If the value of `enabledNote` is false, users can not set this attribute and get default value `allowAll`. */
	noteType?: "allowAll" | "allowOne";
	/** Whether or not to allow any attendee to have closed captions in the meeting. 
	 *  The value of this attribute also depends on the session type. */
	enabledClosedCaptions?: boolean;
	/** Whether or not to allow any attendee to transfer files in the meeting. 
	 *  The value of this attribute also depends on the session type. */
	enabledFileTransfer?: boolean;
	/** Whether or not to allow any attendee to share Universal Communications Format media files in the meeting. 
	 *  The value of this attribute also depends on the sessionType. */
	enabledUCFRichMedia?: boolean;
}

export type WebexAudioConnectionOptions = {
	/** Whether or not to allow attendees to unmute themselves. */
	allowAttendeeToUnmuteSelf: boolean;
	/** Whether or not to auto-mute attendees when attendees enter meetings. */
	muteAttendeeUponEntry: boolean;
	/** Select the sound you want users who have a phone audio connection to hear when someone enters or exits the meeting. 
	 * `beep` All call-in users joining the meeting will hear the beep.
	 * `announceName` All call-in users joining the meeting will hear their names.
	 * `noTone`	Turn off beeps and name announcements. */
	entryAndExitTone: "beep" | "announceName" | "noTone";
	/** Whether or not to allow the host to unmute participants. */
	allowHostToUnmuteParticipants: boolean;
	/** Choose how meeting attendees join the audio portion of the meeting. */
	audioConnectionType: "webexAudio" | "VoIP" | "other" | "none";
	/** Whether or not to allow attendees to receive a call-back and call-in is available. Can only be set true for a webinar. */
	enabledAudienceCallBack: boolean;
	/** Whether or not to show global call-in numbers to attendees. */
	enabledGlobalCallIn: boolean;
	/** Whether or not to show toll-free call-in numbers. */
	enabledTollFreeCallIn: boolean;
}

export type WebexMeetingCreate = WebexMeetingAlways & {
	/** Meeting title. The title can be a maximum of 128 characters long. */
	title: string;
	/** Meeting agenda. The agenda can be a maximum of 1300 characters long. */
	agenda?: string;
	/** Date and time for the start of meeting in any ISO 8601 compliant format. `start` cannot be before current date and time or after `end`.
	 *  Duration between start and end cannot be shorter than 10 minutes or longer than 24 hours. */
	start: string;
	/** Date and time for the end of meeting in any ISO 8601 compliant format. `end` cannot be before current date and time or before start. 
	 *  Duration between start and end cannot be shorter than 10 minutes or longer than 24 hours.*/
	end: string;
	/** Time zone in which the meeting was originally scheduled (conforming with the IANA time zone database). */
	timezone?: string;
	/** Meeting password. Must conform to the site's password complexity settings. */
	password?: string;
	/** Unique identifier for meeting template. */
	templateId?: string;
	/** Meeting series recurrence rule (conforming with RFC 2445), applying only to meeting series.
	 *  It doesn't apply to a scheduled meeting or an ended or ongoing meeting instance. */
	recurance?: string;
	/** Whether or not meeting is recorded automatically. */
	enabledAutoRecordMeeting?: boolean;
	/** Whether or not to allow any attendee with a host account to become a cohost when joining the meeting. */
	allowAnyUserToBeCoHost?: boolean;
	/** Whether or not to allow any attendee to join the meeting before the host joins the meeting. */
	enabledJoinBeforeHost?: boolean;
	/** the number of minutes an attendee can join the meeting before the meeting start time and the host joins. 
	 *  This attribute is only applicable if the `enabledJoinBeforeHost` attribute is set to true. 
	 *  Valid options are 0, 5, 10 and 15. Default is 0 if not specified. */
	joinBeforeHostMinutes?: number;
	/** Whether or not to allow any attendee to connect audio in the meeting before the host joins the meeting. 
	 *  This attribute is only applicable if the enabledJoinBeforeHost attribute is set to true. */
	enableConnectAudioBeforeHost?: boolean;
	/** Whether or not to allow the meeting to be listed on the public calendar. */
	publicMeeting?: boolean;
	/** Whether or not to send emails to host and invitees. It is an optional field and default value is true. 
	 *  The default value for an ad-hoc meeting is false and the user's input value will be ignored. */
	sendEmail?: boolean;
	/** Email address for the meeting host. This attribute should only be set if the user or application calling the API has the admin-level scopes. 
	 *  When used, the admin may specify the email of a user in a site they manage to be the meeting host. */
	hostEmail?: string;
	/** URL of the Webex site which the meeting is created on. If not specified, the meeting is created on user's preferred site.
	 *  All available Webex sites and preferred site of the user can be retrieved by Get Site List API. */
	siteUrl?: string;
	/** Meeting Options. */
	meetingOptions?: Partial<WebexMeetingOptions>;
	/** Audio connection options. */
	audioConnectionOptions?: Partial<WebexAudioConnectionOptions>;
	integrationTags?: string[];
}

export type WebexMeetingUpdate = WebexMeetingAlways & Partial<Omit<WebexMeetingCreate, "templateId">> & {
	/** Unique identifier for meeting. For a meeting series, the id is used to identify the entire series. */
	id: string;
}

type WebexMeetingDelete = Pick<WebexMeeting, "accountId" | "id">;

type CallInNumber = {
	/** Label for the call-in number. */
	label: string;
	/** Call-in number to join the teleconference from a phone. */
	callInNumber: string;
	/** Type of toll for the call-in number. */
	tollType: "toll" | "tollFree";
}

type LinksForTelephony = {
	/** Link relation describing how the target resource is related to the current context (conforming with RFC5998). */
	rel: string;
	/** Target resource URI (conforming with RFC5998). */
	href: string;
	/** Target resource method (conforming with RFC5998). */
	method: string;
}

type Telephony = {
	/** Code for authenticating a user to join teleconference. Users join the teleconference using the call-in number or the global call-in number, followed by the value of the accessCode. */
	accessCode: string;
	/** Array of call-in numbers for joining a teleconference from a phone. */
	callInNumbers: CallInNumber[];
	/** HATEOAS information of global call-in numbers for joining a teleconference from a phone. */
	link: LinksForTelephony[]
}

export interface WebexMeeting extends Required<WebexMeetingUpdate> {
	/** Meeting number. Applies to meeting series, scheduled meeting, and meeting instances, but not to meeting instances which have ended.*/
	meetingNumber: string;
	/** Meeting type. 
	 * - `meetingSeries`    Instance from a primary meeting series.
	 * - `scheduledMeeting` Meeting instance that is in progress or has completed.
	 * - `meeting`          Meeting instance that is in progress or has completed. */
	meetingType: "meetingSeries" | "scheduledMeeting" | "meeting";
	/** Meeting state.
	 * - `active`     Only applies to a meeting series. Indicates that one or more future scheduled meetings exist for this meeting series.
	 * - `scheduled`  Only applies to scheduled meeting. Indicates that the meeting is scheduled in the future.
	 * - `ready`      Only applies to scheduled meeting. Indicates that this scheduled meeting is ready to start or join immediately.
	 * - `lobby`      Only applies to meeting instances. Indicates that a locked meeting has been joined by participants, but no hosts have joined.
	 * - `inProgress` Applies to meeting series and meeting instances. For a meeting series, indicates that an instance of this series is happening now. 
	 *                For a meeting instance, indicates that the meeting has been joined and unlocked.
	 * - `ended`      Applies to scheduled meetings and meeting instances. For scheduled meetings, indicates that the meeting was started and is now over. 
	 *                For meeting instances, indicates that the meeting instance has concluded.
	 * - `missed`     This state only applies to scheduled meetings. Indicates that the meeting was scheduled in the past but never happened.
	 * - `expired`    This state only applies to a meeting series. Indicates that all scheduled meetings of this series have passed. */
	state: "active" | "scheduled" |	"ready" | "lobby" | "inProgress" | "ended" | "missed" |	"expired";
	/** Link to a meeting information page where the meeting client is launched if the meeting is ready to start or join. */
	webLink: string;
	/** Site URL for the meeting. */
	siteUrls: string;
	/** SIP address for callback from a video system. */
	sipAddress: string;
	/** Information for callbacks from a meeting to phone or for joining a teleconference using a phone. */
	telephony: Telephony;
	/** Key for joining the meeting as host. */
	hostKey: string;
	/** Unique identifier for the meeting host. */
	hostUserId: string;
	/** Email address for the meeting host. */
	hostEmail: string;
	/** Display name for the meeting host. */
	hostDisplayName: string;
}

export type WebexMeetingTemplate = {
	/** Unique identifier for meeting template. */
	id: string;
	/** Meeting template name. */
	name: string;
	/** Meeting template locale. */
	locale: string;
	/** Site URL for the meeting template. */
	siteUrl: string;
	templateType: "meeting" | "webinar";
	/** Whether or not the meeting template is a default template. */
	isDefault: boolean;
	/** Whether or not the meeting template is a standard template. */
	isStandard: boolean;
	/** Meeting object which is used to create a meeting by the meeting template. 
	 * Please note that the meeting object should be used to create a meeting immediately after retrieval since the start and end may be invalid quickly after generation. */
	meeting: object;
}

/**
 * Convert from webex meeting info to confiurable parameters
 * 
 * @param i - Webex meeting info
 * @returns Webex meeting configuration parameters
 */
export function webexMeetingToWebexMeetingParams(i: WebexMeeting): WebexMeetingUpdate {
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
		if (typeof o[key] === 'undefined')
			delete o[key];
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
	ids
}: {
	groupId?: string;
	sessionId?: string;
	fromDate?: string;
	toDate?: string;
	timezone?: string;
	ids?: string[];
}) {
	let webexMeetings: WebexMeeting[] = [];
	const accounts = await getOAuthAccounts({type: "webex", groupId});
	let to: DateTime, from: DateTime;
	if (sessionId) {
		const session = await getSession(Number(sessionId));
		if (!session)
			throw new NotFoundError(`Session id=${sessionId} not found`);
		if (!timezone)
			timezone = session.timezone || defaultTimezone;
		from = DateTime.fromISO(session.startDate, {zone: timezone});
		to = DateTime.fromISO(session.endDate, {zone: timezone}).plus({days: 1});
	}
	else {
		if (!timezone)
			timezone = defaultTimezone;
		from = fromDate? DateTime.fromISO(fromDate, {zone: timezone}): DateTime.now().setZone(timezone);
		to = toDate? DateTime.fromISO(toDate, {zone: timezone}).plus({days: 1}): from.plus({years: 1});
	}
	for (const account of accounts) {
		const api = getWebexApi(account.id);

		const params = {
			meetingType: 'scheduledMeeting',
			scheduledType: 'meeting',
			from: from.toISO(),
			to: to.toISO(),
			max: 100,
		}
		const response = await api.get('/meetings', {params, headers: {timezone}}).catch(webexApiError);
		//console.log(account.name, params, response.data.items.length)

		let meetings: WebexMeeting[] = response?.data.items || [];
		meetings = meetings.map(m => ({...m, groupId, accountId: account.id, accountName: account.name}));
		webexMeetings = webexMeetings.concat(meetings);
	}
	// Looking for specific meetings
	if (ids)
		webexMeetings = webexMeetings.filter(m => ids.includes(m.id));
	webexMeetings = webexMeetings.sort((a, b) => DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis());
	return webexMeetings;
}

export async function getWebexMeeting(accountId: number, id: string, timezone?: string): Promise<WebexMeeting> {
	const api = getWebexApi(accountId);
	const config = timezone? {headers: {timezone}}: undefined;
	return api.get(`/meetings/${id}`, config)
		.then(response => response.data)
		.catch(webexApiError);
}


/**
 * Add a Webex meeting.
 *
 * @param webexMeeting Webex meeting create object that includes:
 * @param webexMeeting.accountId Webex account ID.
 * @returns an object that is the Webex meeting as added.
 */
export async function addWebexMeeting({accountId, ...params}: WebexMeetingCreate): Promise<WebexMeeting> {
	const api = getWebexApi(accountId);
	return api.post('/meetings', params)
		.then(response => ({accountId, ...response.data}))
		.catch(webexApiError);
}

function validWebexMeetingCreate(m: any): m is WebexMeetingCreate {
	return isPlainObject(m) &&
		typeof m.accountId === 'number' &&
		typeof m.title === 'string';
}

function validateMeetingCreateArray(webexMeetings: any): asserts webexMeetings is WebexMeetingCreate[] {
	if (!Array.isArray(webexMeetings))
		throw new TypeError("Badly formed meetings; expected array");
	webexMeetings.forEach(m => {
		if (!validWebexMeetingCreate(m))
			throw new TypeError('Badly formed meetings array, expected array of webex meeting create objects');
		getWebexApi(m.accountId);
	});
}

/**
 * Add Webex meetings.
 *
 * @param meetings Expects an array of Webex meeting create objects, throws otherwise.
 * @returns an array of Webex meeting objects as added.
 */
export async function addWebexMeetings(webexMeetings: any) {
	validateMeetingCreateArray(webexMeetings);
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
export async function updateWebexMeeting({accountId, id, ...params}: WebexMeetingUpdate): Promise<WebexMeeting> {
	const api = getWebexApi(accountId);
	return api.patch(`/meetings/${id}`, params)
		.then(response => ({accountId, ...response.data}))
		.catch(webexApiError);
}

function validWebexMeetingUpdate(m: any): m is WebexMeetingUpdate {
	return isPlainObject(m) &&
		typeof m.accountId === 'number' &&
		typeof m.id === 'string' &&
		(typeof m.title === 'string' || typeof m.title === 'undefined');
}

function validateWebexMeetingUpdateArray(webexMeetings: any): asserts webexMeetings is WebexMeetingUpdate[] {
	if (!Array.isArray(webexMeetings))
		throw new TypeError("Badly formed meetings; expected array");
	webexMeetings.forEach(m => {
		if (!validWebexMeetingUpdate(m))
			throw new TypeError("Badly formed meetings; expected array of webex update objects");
		getWebexApi(m.accountId);
	});
}

/**
 * Update Webex meetings.
 *
 * @param webexMeetings Expects an array of Webex meeting update objects, throws otherwise.
 * @returns an array of Webex meeting objects.
 */
export async function updateWebexMeetings(webexMeetings: any) {
	validateWebexMeetingUpdateArray(webexMeetings);
	return Promise.all(webexMeetings.map(updateWebexMeeting));
}

/**
 * Delete a Webex meeting.
 *
 * @param webexMeeting that includes:
 * @param webexMeeting.accountId Webex account ID
 * @param webexMeeting.id Webex meeting ID
 */
export async function deleteWebexMeeting({accountId, id}: Pick<WebexMeeting, "accountId" | "id">) {
	const api = getWebexApi(accountId);
	return api.delete(`/meetings/${id}`)
		.then(response => response.data)
		.catch(webexApiError);
}

function validWebexMeetingDelete(m: any): m is WebexMeetingDelete {
	return isPlainObject(m) &&
		typeof m.accountId === 'number' &&
		typeof m.id === 'string';
}

function validateWebexMeetingDeleteArray(webexMeetings: any): asserts webexMeetings is WebexMeetingDelete[] {
	if (!Array.isArray(webexMeetings))
		throw new TypeError("Badly formed meetings; expected array");
		webexMeetings.forEach(m => {
		if (!validWebexMeetingDelete(m))
			throw new TypeError("Badly formed meetings; expected array of objects with shape {accountId: number, id: string}");
		getWebexApi(m.accountId);
	});
}

/**
 * Delete Webex meetings.
 *
 * @param webexMeetings Expect an array of objects with shape {accountId, id}, throws otherwise
 * @returns the number of meetings deleted.
 */
export async function deleteWebexMeetings(webexMeetings: any) {
	validateWebexMeetingDeleteArray(webexMeetings);
	await Promise.all(webexMeetings.map(deleteWebexMeeting));
	return webexMeetings.length;
}