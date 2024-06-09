import { z } from "zod";
import { groupIdSchema } from "./groups";
import { sessionIdSchema } from "./sessions";
import { oAuthAccountSchema } from "./oauthAccounts";

export const webexAccountCreateSchema = z.object({
	name: z.string(),
});

export const webexAccountChangeSchema = webexAccountCreateSchema.partial();

export const webexAccountsQuery = z.object({
	id: z.number().optional(),
	groupId: groupIdSchema.optional(),
	isActive: z.boolean().optional(),
});

export type WebexAccountCreate = z.infer<typeof webexAccountCreateSchema>;
export type WebexAccountChange = z.infer<typeof webexAccountChangeSchema>;
export type WebexAccountsQuery = z.infer<typeof webexAccountsQuery>;

export const webexMeetingAlwaysSchema = z.object({
	accountId: z.number(),
	accountName: z.string().optional(),
});
export type WebexMeetingAlways = z.infer<typeof webexMeetingAlwaysSchema>;

export const webexMeetingOptionsSchema = z.object({
	/** Whether or not to allow any attendee to chat in the meeting.
	 *  Also depends on the session type. */
	enabledChat: z.boolean().optional(),
	/** Whether or not to allow any attendee to have video in the meeting.
	 *  Also depends on the session type. */
	enabledVideo: z.boolean().optional(),
	/** Whether or not to allow any attendee to poll in the meeting.
	 *  Can only be set true for a webinar. */
	enabledPolling: z.boolean().optional(),
	/** Whether or not to allow any attendee to take notes in the meeting.
	 *  The value of this attribute also depends on the session type. */
	enabledNote: z.boolean().optional(),
	/** Whether note taking is enabled. If the value of `enabledNote` is false, users can not set this attribute and get default value `allowAll`. */
	noteType: z.enum(["allowAll", "allowOne"]).optional(),
	/** Whether or not to allow any attendee to have closed captions in the meeting.
	 *  The value of this attribute also depends on the session type. */
	enabledClosedCaptions: z.boolean().optional(),
	/** Whether or not to allow any attendee to transfer files in the meeting.
	 *  The value of this attribute also depends on the session type. */
	enabledFileTransfer: z.boolean().optional(),
	/** Whether or not to allow any attendee to share Universal Communications Format media files in the meeting.
	 *  The value of this attribute also depends on the sessionType. */
	enabledUCFRichMedia: z.boolean().optional(),
});
export type WebexMeetingOptions = z.infer<typeof webexMeetingOptionsSchema>;

export const webexAudioConnectionOptionsSchema = z.object({
	/** Whether or not to allow attendees to unmute themselves. */
	allowAttendeeToUnmuteSelf: z.boolean(),
	/** Whether or not to auto-mute attendees when attendees enter meetings. */
	muteAttendeeUponEntry: z.boolean(),
	/** Select the sound you want users who have a phone audio connection to hear when someone enters or exits the meeting. */
	entryAndExitTone: z.enum([
		"beep", // All call-in users joining the meeting will hear the beep.
		"announceName", // All call-in users joining the meeting will hear their names.
		"noTone", // Turn off beeps and name announcements.
	]),
	/** Whether or not to allow the host to unmute participants. */
	allowHostToUnmuteParticipants: z.boolean(),
	/** Choose how meeting attendees join the audio portion of the meeting. */
	audioConnectionType: z
		.enum(["webexAudio", "VoIP", "other", "none"])
		.optional(),
	/** Whether or not to allow attendees to receive a call-back and call-in is available. Can only be set true for a webinar. */
	enabledAudienceCallBack: z.boolean(),
	/** Whether or not to show global call-in numbers to attendees. */
	enabledGlobalCallIn: z.boolean().optional(),
	/** Whether or not to show toll-free call-in numbers. */
	enabledTollFreeCallIn: z.boolean(),
});
export type WebexAudioConnectionOptions = z.infer<
	typeof webexAudioConnectionOptionsSchema
>;

export const webexMeetingCreateSchema = webexMeetingAlwaysSchema.extend({
	/** Meeting title. The title can be a maximum of 128 characters long. */
	title: z.string(),
	/** Meeting agenda. The agenda can be a maximum of 1300 characters long. */
	agenda: z.string().optional(),
	/** Date and time for the start of meeting in any ISO 8601 compliant format. `start` cannot be before current date and time or after `end`.
	 *  Duration between start and end cannot be shorter than 10 minutes or longer than 24 hours. */
	start: z.string().datetime(),
	/** Date and time for the end of meeting in any ISO 8601 compliant format. `end` cannot be before current date and time or before start.
	 *  Duration between start and end cannot be shorter than 10 minutes or longer than 24 hours.*/
	end: z.string().datetime(),
	/** Time zone in which the meeting was originally scheduled (conforming with the IANA time zone database). */
	timezone: z.string().optional(),
	/** Meeting password. Must conform to the site's password complexity settings. */
	password: z.string().optional(),
	/** Unique identifier for meeting template. */
	templateId: z.string().optional(),
	/** Meeting series recurrence rule (conforming with RFC 2445), applying only to meeting series.
	 *  It doesn't apply to a scheduled meeting or an ended or ongoing meeting instance. */
	recurance: z.string().optional(),
	/** Whether or not meeting is recorded automatically. */
	enabledAutoRecordMeeting: z.boolean().optional(),
	/** Whether or not to allow any attendee with a host account to become a cohost when joining the meeting. */
	allowAnyUserToBeCoHost: z.boolean().optional(),
	/** Whether or not to allow any attendee to join the meeting before the host joins the meeting. */
	enabledJoinBeforeHost: z.boolean().optional(),
	/** the number of minutes an attendee can join the meeting before the meeting start time and the host joins.
	 *  This attribute is only applicable if the `enabledJoinBeforeHost` attribute is set to true.
	 *  Valid options are 0, 5, 10 and 15. Default is 0 if not specified. */
	joinBeforeHostMinutes: z.number().optional(),
	/** Whether or not to allow any attendee to connect audio in the meeting before the host joins the meeting.
	 *  This attribute is only applicable if the enabledJoinBeforeHost attribute is set to true. */
	enableConnectAudioBeforeHost: z.boolean().optional(),
	/** Whether or not to allow the meeting to be listed on the public calendar. */
	publicMeeting: z.boolean().optional(),
	/** Whether or not to send emails to host and invitees. It is an optional field and default value is true.
	 *  The default value for an ad-hoc meeting is false and the user's input value will be ignored. */
	sendEmail: z.boolean().optional(),
	/** Email address for the meeting host. This attribute should only be set if the user or application calling the API has the admin-level scopes.
	 *  When used, the admin may specify the email of a user in a site they manage to be the meeting host. */
	hostEmail: z.string().optional(),
	/** URL of the Webex site which the meeting is created on. If not specified, the meeting is created on user's preferred site.
	 *  All available Webex sites and preferred site of the user can be retrieved by Get Site List API. */
	siteUrl: z.string().optional(),
	/** Meeting Options. */
	meetingOptions: webexMeetingOptionsSchema.optional(),
	/** Audio connection options. */
	audioConnectionOptions: webexAudioConnectionOptionsSchema.optional(),
	integrationTags: z.string().array().optional(),
});
export const webexMeetingCreatesSchema = webexMeetingCreateSchema.array();

export const webexMeetingChangeSchema = webexMeetingCreateSchema
	.omit({ templateId: true })
	.partial()
	.extend({ id: z.string() })
	.merge(webexMeetingAlwaysSchema);
export const webexMeetingChangesSchema = webexMeetingChangeSchema.array();

const callInNumberSchema = z.object({
	/** Label for the call-in number. */
	label: z.string(),
	/** Call-in number to join the teleconference from a phone. */
	callInNumber: z.string(),
	/** Type of toll for the call-in number. */
	tollType: z.enum(["toll", "tollFree"]),
});

const linksForTelephonySchema = z.object({
	/** Link relation describing how the target resource is related to the current context (conforming with RFC5998). */
	rel: z.string(),
	/** Target resource URI (conforming with RFC5998). */
	href: z.string(),
	/** Target resource method (conforming with RFC5998). */
	method: z.string(),
});

const telephonySchema = z.object({
	/** Code for authenticating a user to join teleconference. Users join the teleconference using the call-in number or the global call-in number, followed by the value of the accessCode. */
	accessCode: z.string(),
	/** Array of call-in numbers for joining a teleconference from a phone. */
	callInNumbers: callInNumberSchema.array(),
	/** HATEOAS information of global call-in numbers for joining a teleconference from a phone. */
	link: linksForTelephonySchema.array(),
});

export const webexMeetingSchema = webexMeetingChangeSchema.required().extend({
	/** Meeting number. Applies to meeting series, scheduled meeting, and meeting instances, but not to meeting instances which have ended.*/
	meetingNumber: z.string(),
	/** Meeting type. */
	meetingType: z.enum([
		"meetingSeries", // Instance from a primary meeting series.
		"scheduledMeeting", // Meeting instance that is in progress or has completed.
		"meeting", // Meeting instance that is in progress or has completed.
	]),
	/** Meeting state */
	state: z.enum([
		"active", // Only applies to a meeting series. Indicates that one or more future scheduled meetings exist for this meeting series.
		"scheduled", // Only applies to scheduled meeting. Indicates that the meeting is scheduled in the future.
		"ready", // Only applies to scheduled meeting. Indicates that this scheduled meeting is ready to start or join immediately.
		"lobby", // Only applies to meeting instances. Indicates that a locked meeting has been joined by participants, but no hosts have joined.
		"inProgress", // Applies to meeting series and meeting instances. For a meeting series, indicates that an instance of this series is happening now.
		// For a meeting instance, indicates that the meeting has been joined and unlocked.
		"ended", // Applies to scheduled meetings and meeting instances. For scheduled meetings, indicates that the meeting was started and is now over.
		// For meeting instances, indicates that the meeting instance has concluded.
		"missed", // This state only applies to scheduled meetings. Indicates that the meeting was scheduled in the past but never happened.
		"expired", // This state only applies to a meeting series. Indicates that all scheduled meetings of this series have passed.
	]),
	/** Link to a meeting information page where the meeting client is launched if the meeting is ready to start or join. */
	webLink: z.string(),
	/** Site URL for the meeting. */
	siteUrls: z.string(),
	/** SIP address for callback from a video system. */
	sipAddress: z.string(),
	/** Information for callbacks from a meeting to phone or for joining a teleconference using a phone. */
	telephony: telephonySchema,
	/** Key for joining the meeting as host. */
	hostKey: z.string(),
	/** Unique identifier for the meeting host. */
	hostUserId: z.string(),
	/** Email address for the meeting host. */
	hostEmail: z.string(),
	/** Display name for the meeting host. */
	hostDisplayName: z.string(),
});

export const webexMeetingDeleteSchema = webexMeetingSchema.pick({
	accountId: true,
	id: true,
});
export const webexMeetingDeletesSchema = webexMeetingDeleteSchema.array();

export const webexMeetingsQuerySchema = z.object({
	groupId: groupIdSchema.optional(),
	sessionId: sessionIdSchema.optional(),
	fromDate: z.string().date().optional(),
	toDate: z.string().date().optional(),
	timezone: z.string().optional(),
	ids: webexMeetingSchema.shape.id.array().optional(),
});
export type WebexMeetingsQuery = z.infer<typeof webexMeetingsQuerySchema>;

export const webexMeetingTemplateSchema = z.object({
	/** Unique identifier for meeting template. */
	id: z.string(),
	/** Meeting template name. */
	name: z.string(),
	/** Meeting template locale. */
	locale: z.string(),
	/** Site URL for the meeting template. */
	siteUrl: z.string(),
	templateType: z.enum(["meeting", "webinar"]),
	/** Whether or not the meeting template is a default template. */
	isDefault: z.boolean(),
	/** Whether or not the meeting template is a standard template. */
	isStandard: z.boolean(),
	/** Meeting object which is used to create a meeting by the meeting template.
	 * Please note that the meeting object should be used to create a meeting immediately after retrieval since the start and end may be invalid quickly after generation. */
	meeting: z.object({}),
});
type WebexMeetingTemplate = z.infer<typeof webexMeetingTemplateSchema>;

export const webexAudioPreferencesSchema = z.object({
	defaultAudioType: z.enum([
		"webexAudio",
		"voipOnly",
		"otherTeleconferenceService",
		"none",
	]),
	otherTeleconferenceDescription: z.string(),
	enabledGlobalCallIn: z.boolean(),
	enabledAutoConnection: z.boolean(),
	audioPin: z.string(),
	officeNumber: z.any(),
	mobileNumber: z.any(),
});
type WebexAudioPreferences = z.infer<typeof webexAudioPreferencesSchema>;

export const webexSchedulingOptionsSchema = z.object({
	enabledJoinBeforeHost: z.boolean(),
	joinBeforeHostMinutes: z.number(),
	enabledAutoShareRecording: z.boolean(),
});
type WebexSchedulingOptions = z.infer<typeof webexSchedulingOptionsSchema>;

export const webexPersonSchema = z.object({
	id: z.string(),
	emails: z.string().email().array(),
	phoneNumbers: z.object({}),
	displayName: z.string(),
	userName: z.string(), // Email address
	orgId: z.string(),
});

export const webexMeetingPreferencesSchema = z.object({
	audio: webexAudioPreferencesSchema,
	schedulingOptions: webexSchedulingOptionsSchema,
	sites: z.any(),
	personalMeetingRoom: z.any(),
});
export type WebexMeetingPreferences = z.infer<
	typeof webexMeetingPreferencesSchema
>;

export const webexSitesSchema = z.object({
	siteUrl: z.string(),
	default: z.boolean(),
});
export type WebexSites = z.infer<typeof webexSitesSchema>;

export const webexAccountSchema = oAuthAccountSchema
	.omit({ authParams: true })
	.merge(
		z.object({
			authUrl: z.string().url(),
			displayName: z.string().optional(),
			userName: z.string().optional(),
			owner: webexPersonSchema.optional(),
			siteUrl: z.string().url().optional(),
			preferences: webexMeetingPreferencesSchema.optional(),
			templates: webexMeetingTemplateSchema.array(),
			lastAccessed: z.string().datetime().nullable(),
		})
	);
export type WebexAccount = z.infer<typeof webexAccountSchema>;

export type WebexMeeting = z.infer<typeof webexMeetingSchema>;
export type WebexMeetingCreate = z.infer<typeof webexMeetingCreateSchema>;
export type WebexMeetingChange = z.infer<typeof webexMeetingChangeSchema>;
export type WebexMeetingDelete = z.infer<typeof webexMeetingDeleteSchema>;
