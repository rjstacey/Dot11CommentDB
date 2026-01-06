import { Socket } from "socket.io";
import throttle from "lodash.throttle";
import { AccessLevel } from "@schemas/access.js";
import { groupJoinReqSchema, GroupJoinRes } from "@schemas/poll.js";
import { Member } from "@schemas/members.js";
import type { UserContext } from "../services/users.js";
import { ForbiddenError, NotFoundError } from "../utils/index.js";
import { getGroups } from "../services/groups.js";
import { getPollEvents, getPolls } from "../services/poll.js";
import { getMember } from "@/services/members.js";

import { validCallback, okCallback, errorCallback } from "./pollingBasic.js";
import { sendVotedInd, socketMaybeSetActivePoll } from "./pollingPoll.js";

class NoGroupError extends Error {
	name = "NoGroupError";
}

function leaveRooms(socket: Socket) {
	const rooms = [...socket.rooms];
	rooms.forEach((room) => {
		if (room !== socket.id) {
			console.log("leave -", room);
			socket.leave(room);
		}
	});
}

function socketJoinGroup(
	socket: Socket,
	groupId: string,
	member: Member | undefined,
	access: AccessLevel
) {
	leaveRooms(socket);
	socket.join(groupId);
	socket.data.groupId = groupId;
	socket.data.member = member;
	socket.data.access = access;
}

function socketLeaveGroup(socket: Socket) {
	leaveRooms(socket);
	delete socket.data.groupId;
	delete socket.data.member;
	delete socket.data.access;
}

export function socketGetGroupInfo(socket: Socket) {
	const groupId = socket.data.groupId;
	if (typeof groupId !== "string")
		throw new NoGroupError("You must join a group first");
	const member: Member = socket.data.member;
	const access: AccessLevel = socket.data.access;
	return { groupId, member, access };
}

export async function socketGetGroupMembersPresent(socket: Socket) {
	const groupId = socketGetGroupInfo(socket).groupId;
	const sockets = await socket.nsp.in(groupId).fetchSockets();
	const entities: Record<number, Member> = {};
	for (const s of sockets) {
		const member: Member = s.data.member;
		entities[member.SAPIN] = member;
	}
	// A member may have more than one socket connection
	return Object.values(entities);
}

/** group:join({groupId}) - Join a group */
export async function onGroupJoin(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const { groupId } = groupJoinReqSchema.parse(payload);
		const [group] = await getGroups(this.data.user, { id: groupId });
		if (!group) throw new NotFoundError("No such group: id=" + groupId);
		const access = group.permissions.polling || AccessLevel.none;
		if (access < AccessLevel.ro) throw new ForbiddenError();

		const user: UserContext = this.data.user;
		let member = await getMember(groupId, user.SAPIN);
		if (!member) {
			member = {
				...user,
				groupId,
				FirstName: "",
				MI: "",
				LastName: "",
				Affiliation: "",
				Employer: "",
				ContactInfo: null,
				ContactEmails: [],
				ObsoleteSAPINs: [],
				ReplacedBySAPIN: null,
				StatusChangeDate: null,
				StatusChangeHistory: [],
				StatusChangeOverride: false,
				DateAdded: new Date().toISOString(),
				MemberID: null,
				Notes: null,
				InRoster: false,
				Status: "Non-Voter",
			};
		}
		socketJoinGroup(this, groupId, member, access);

		const events = await getPollEvents({ groupId });
		const activeEvent = events.find((e) => e.isPublished);
		const polls = activeEvent
			? await getPolls({ eventId: activeEvent.id })
			: [];
		okCallback(callback, {
			groupId,
			events,
			polls,
		} satisfies GroupJoinRes);

		const activePoll = polls.find((p) => p.state !== null);
		if (activePoll) socketMaybeSetActivePoll(this, activePoll);

		if (this.data.throttledSendVotedInd === undefined) {
			this.data.throttledSendVotedInd = throttle(
				sendVotedInd.bind(this),
				500
			);
		}
		this.data.throttledSendVotedInd();
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** group:leave() - Leave the current group */
export async function onGroupLeave(this: Socket) {
	socketLeaveGroup(this);
	delete this.data.throttledSendVotedInd;
}
