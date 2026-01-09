import { createSlice, isPlainObject } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";
import { z } from "zod";
import {
	pollingSocketName,
	GroupJoinReq,
	groupJoinResSchema,
	PollingError,
	PollingOK,
} from "@schemas/poll";
import { AppThunk, RootState, setError } from ".";
import { selectUser } from ".";
import { selectGroup, selectSelectedGroupId, AccessLevel } from "./groups";
import {
	setSelectedEventId as pollingAdminSetSelectedEventId,
	setSelectedPollId as pollingAdminSetSelectedPollId,
	setEvents as pollingAdminSetEvents,
	setPolls as pollingAdminSetPolls,
} from "./pollingAdmin";
import {
	setPolls as pollingUserSetPolls,
	setPollsVotes as pollingUserSetPollsVotes,
} from "./pollingUser";
import { pollingAdminEventsRegister } from "./pollingAdminEvents";
import { pollingUserEventsRegister } from "./pollingUserEvents";

/* Create slice */
const initialState = {
	isConnected: false,
};
const dataSet = "pollingSocket";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setConnected(state) {
			state.isConnected = true;
		},
		setDisconnected(state) {
			state.isConnected = false;
		},
	},
});

export default slice;

/** Slice actions */
const { setConnected, setDisconnected } = slice.actions;

/** Selectors */
const selectPollingSocketState = (state: RootState) => state[dataSet];
export const selectPollingSocketIsConnected = (state: RootState) =>
	selectPollingSocketState(state).isConnected;

/** Thunk actions */
let socket: Socket | undefined = undefined;

function assertHasSocket(socket: Socket | undefined): asserts socket is Socket {
	if (!socket) throw new Error("no socket");
}

export function getSocket() {
	assertHasSocket(socket);
	return socket;
}

function openSocket(token: string) {
	if (!socket) {
		socket = io(pollingSocketName, { query: { token } });
		document.addEventListener("beforeunload", closeSocket);
	}
	return socket;
}

function closeSocket() {
	if (socket) {
		socket.close();
		document.removeEventListener("beforeunload", closeSocket);
		socket = undefined;
	}
}

function isOkResponse(response: unknown): response is PollingOK {
	return (
		isPlainObject(response) &&
		"status" in response &&
		response.status === "OK"
	);
}

function isErrorResponse(response: unknown): response is PollingError {
	return (
		isPlainObject(response) &&
		"status" in response &&
		response.status === "Error" &&
		"error" in response &&
		isPlainObject(response.error) &&
		"message" in response.error &&
		typeof response.error.message === "string" &&
		"name" in response.error &&
		typeof response.error.name === "string"
	);
}

export function okResponse<T extends z.ZodTypeAny>(
	response: unknown,
	schema?: T
): z.infer<T> | undefined {
	if (isOkResponse(response)) {
		return schema ? schema.parse(response.data) : undefined;
	} else if (isErrorResponse(response)) {
		const error = new Error(response.error.message);
		if (response.error.name) error.name = response.error.name;
		throw error;
	}
	throw new Error("polling socket protocol error");
}

export function pollingSocketEmit(
	message: string,
	data?: unknown
): Promise<undefined>;
export function pollingSocketEmit<T extends z.ZodTypeAny>(
	message: string,
	data?: unknown,
	schema?: T
): Promise<z.infer<T>>;
export function pollingSocketEmit<T extends z.ZodTypeAny>(
	message: string,
	data?: unknown,
	schema?: T
): Promise<z.infer<T> | undefined> {
	return new Promise((resolve, reject) => {
		try {
			const socket = getSocket();
			socket.emit(message, data, (response: unknown) => {
				try {
					const result = okResponse(response, schema);
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
		} catch (error) {
			reject(error);
		}
	});
}

export function handleError(error: unknown) {
	let name = "Error";
	let message = "Unknown";
	if (error instanceof Error) {
		name = error.name;
		message = error.message;
	}
	return setError(name, message);
}

export const pollingSocketConnect =
	(): AppThunk => async (dispatch, getState) => {
		if (socket) return; // Already connected

		const user = selectUser(getState());
		socket = openSocket(user.Token!);

		if (process.env.NODE_ENV === "development") {
			socket
				.onAny((event, ...args) => {
					console.log("in", event, args);
				})
				.onAnyOutgoing((event, ...args) => {
					console.log("out", event, args);
				});
		}

		pollingAdminEventsRegister(socket);
		pollingUserEventsRegister(socket);

		socket.on("connect", () => {
			assertHasSocket(socket);
			console.log(`connect (recovered=${socket.recovered})`);
			const groupId = selectSelectedGroupId(getState());
			dispatch(
				groupId
					? pollingSocketJoinGroup(groupId)
					: pollingSocketLeaveGroup()
			);
			dispatch(setConnected());
		});
		socket.on("disconnect", () => {
			console.log("disconnect");
			dispatch(setDisconnected());
		});
	};

export const pollingSocketDisconnect = (): AppThunk => async (dispatch) => {
	console.log("disconnect");
	closeSocket();
	dispatch(setDisconnected());
};

export const pollingSocketJoinGroup =
	(groupId: string): AppThunk =>
	async (dispatch, getState) => {
		try {
			const { events, polls, pollsVotes } = await pollingSocketEmit(
				"group:join",
				{ groupId } satisfies GroupJoinReq,
				groupJoinResSchema
			);
			const group = selectGroup(getState(), groupId);
			const access = group?.permissions.polling || AccessLevel.none;
			const activeEvent = events.find((e) => e.isPublished);
			const activePoll = polls.find((p) => Boolean(p.state));
			if (access >= AccessLevel.rw) {
				dispatch(pollingAdminSetEvents(events));
				dispatch(pollingAdminSetPolls(polls));
				dispatch(
					pollingAdminSetSelectedEventId(activeEvent?.id || null)
				);
				dispatch(pollingAdminSetSelectedPollId(activePoll?.id || null));
			}
			dispatch(pollingUserSetPolls(polls));
			dispatch(pollingUserSetPollsVotes(pollsVotes));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingSocketLeaveGroup = (): AppThunk => async (dispatch) => {
	console.log("leave group");
	try {
		await pollingSocketEmit("group:leave");
	} catch (error) {
		dispatch(handleError(error));
	}
};
