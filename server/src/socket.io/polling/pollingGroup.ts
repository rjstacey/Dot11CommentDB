import { Namespace, Socket } from "socket.io";
import debounce from "lodash.debounce";
import { AccessLevel } from "@schemas/access.js";
import { groupJoinReqSchema, GroupJoinRes, Poll } from "@schemas/poll.js";
import { Member } from "@schemas/members.js";
import type { UserContext } from "../../services/users.js";
import { ForbiddenError, NotFoundError } from "../../utils/index.js";
import { getGroups } from "../../services/groups.js";
import { getPollEvents, getPolls, pollResults } from "../../services/poll.js";
import { getMember } from "@/services/members.js";

import { validCallback, okCallback, errorCallback } from "./pollingBasic.js";
import {
	pollingPollVotedInd,
	pollingPollRegister,
	pollingPollUnregister,
} from "./pollingPoll.js";
import {
	pollingEventRegister,
	pollingEventUnregister,
} from "./pollingEvent.js";

function userToNonVotingMember(user: UserContext, groupId: string): Member {
	return {
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

export class GroupContext {
	constructor(nsp: Namespace, groupId: string) {
		this.nsp = nsp;
		this.id = groupId;
		this.memberEntities = {};
		this.accessEntities = {};
		this.memberIds = [];
		this.activePoll = null;
		this.publishedEventId = null;
		this.sendVotedInd = debounce(() => this.sendVoted(), 1000);
	}
	public nsp: Namespace;
	public id: string;
	public memberEntities: Record<number, Member>;
	public accessEntities: Record<number, number>;
	public memberIds: number[];
	public activePoll: Poll | null;
	public publishedEventId: number | null;
	public sendVotedInd: () => void;

	addMember(member: Member, access: number) {
		if (!this.memberEntities[member.SAPIN])
			this.memberIds.push(member.SAPIN);
		this.memberEntities[member.SAPIN] = member;
		this.accessEntities[member.SAPIN] = access;
		this.sendVotedInd();
	}

	async removeMember(sapin: number): Promise<void> {
		let count = 0;
		for (const s of await this.nsp.to(this.id).fetchSockets()) {
			if (s.data.user.SAPIN === sapin) count++;
		}
		if (count === 1) {
			const i = this.memberIds.indexOf(sapin);
			this.memberIds.splice(i, 1);
			delete this.memberEntities[sapin];
			delete this.accessEntities[sapin];
			this.sendVotedInd();
		}
	}

	getMemberAccess(sapin: number): number {
		return this.accessEntities[sapin] || AccessLevel.none;
	}

	getMembers(): Member[] {
		return this.memberIds.map((sapin) => this.memberEntities[sapin]);
	}

	setActivePoll(poll: Poll | null) {
		this.activePoll = poll;
		this.sendVotedInd();
	}

	setPublishedEventId(eventId: number | null) {
		this.publishedEventId = eventId;
	}

	usersEmit(event: string, payload: unknown) {
		this.nsp.to(this.id).emit(event, payload);
	}

	async userEmit(sapin: number, event: string, payload: unknown) {
		for (const s of await this.nsp.to(this.id).fetchSockets()) {
			const user: UserContext = s.data.user;
			if (user.SAPIN === sapin) s.emit(event, payload);
		}
	}

	async adminsEmit(event: string, payload: unknown) {
		for (const s of await this.nsp.to(this.id).fetchSockets()) {
			const user: UserContext = s.data.user;
			const access = this.getMemberAccess(user.SAPIN);
			if (access >= AccessLevel.rw) s.emit(event, payload);
		}
	}

	async referenceCount() {
		return (await this.nsp.to(this.id).fetchSockets()).length;
	}

	private async sendVoted(): Promise<void> {
		const members = this.memberIds.map(
			(sapin) => this.memberEntities[sapin]
		);
		const voted = await pollingPollVotedInd(this.activePoll, members);
		this.adminsEmit("poll:voted", voted);
	}
}

const groupsContext: Record<string, GroupContext> = {};

/** group:join({groupId}) - Join a group */
async function onGroupJoin(
	this: Socket,
	user: UserContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const { groupId } = groupJoinReqSchema.parse(payload);
		const [group] = await getGroups(user, { id: groupId });
		if (!group) throw new NotFoundError("No such group: id=" + groupId);
		const access = group.permissions.polling || AccessLevel.none;
		if (access < AccessLevel.ro) throw new ForbiddenError();

		let member = await getMember(groupId, user.SAPIN);
		if (!member) member = userToNonVotingMember(user, groupId);

		const events = await getPollEvents({ groupId });

		this.join(groupId);
		let gc = groupsContext[groupId];
		if (!gc) {
			gc = new GroupContext(this.nsp, groupId);
			groupsContext[groupId] = gc;
			const [activePoll] = await getPolls({
				groupId,
				state: ["shown", "opened", "closed"],
			});
			const publishedEvent = events.find((e) => e.isPublished);
			if (publishedEvent) gc.setPublishedEventId(publishedEvent.id);
			if (activePoll) gc.setActivePoll(activePoll);
		}
		gc.addMember(member, access);
		pollingEventRegister(this, gc, member);
		pollingPollRegister(this, gc, member);

		let polls: Poll[] = [];
		if (gc.publishedEventId)
			polls = await getPolls({ eventId: gc.publishedEventId });
		if (gc.activePoll && gc.activePoll.eventId !== gc.publishedEventId)
			polls.push(gc.activePoll);
		const pollsVotes = await pollResults({
			pollId: polls.map((p) => p.id),
			SAPIN: member.SAPIN,
		});

		console.log((await gc.nsp.fetchSockets()).length);

		okCallback(callback, {
			groupId,
			events,
			polls,
			pollsVotes,
			status: member.Status,
		} satisfies GroupJoinRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** group:leave() - Leave the current group */
async function onGroupLeave(this: Socket) {
	pollingEventUnregister(this);
	pollingPollUnregister(this);
	const user = this.data.user as UserContext;
	for (const room of this.rooms) {
		if (room === this.id) continue;
		this.leave(room);
		const gc = groupsContext[room];
		if (gc) {
			gc.removeMember(user.SAPIN);
			if ((await gc.referenceCount()) === 0) delete groupsContext[room];
		}
	}
}

export function pollingGroupRegister(socket: Socket, user: UserContext) {
	const onGroupJoinBd = onGroupJoin.bind(socket, user);
	const onGroupLeaveBd = onGroupLeave.bind(socket);
	socket
		.on("group:join", onGroupJoinBd)
		.on("group:leave", onGroupLeaveBd)
		.on("disconnecting", onGroupLeaveBd);
}
