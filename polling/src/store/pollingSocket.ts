import { createSlice, isPlainObject } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";
import { z } from "zod";
import {
	GroupJoin,
	groupJoinResponseSchema,
	PollingError,
	PollingOK,
} from "@schemas/poll";
import { AppThunk, RootState, setError } from ".";
import { selectUser } from ".";
import { selectGroup, selectSelectedGroupId, AccessLevel } from "./groups";
import {
	setEventId as pollingAdminSetEventId,
	setEvents as pollingAdminSetEvents,
	setPolls as pollingAdminSetPolls,
} from "./pollingAdmin";
import {
	setEvent as pollingUserSetEvent,
	setPolls as pollingUserSetPolls,
} from "./pollingUser";
import { pollingAdminSocketRegister } from "./pollingAdminEvents";
import { pollingUserSocketRegister } from "./pollingUserEvents";

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
		socket = io("/poll", { query: { token } });
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

/*export function okResponse<T extends z.ZodTypeAny>(
	response: unknown,
	schema: T
): z.infer<T>;
export function okResponse(response: unknown): undefined;*/
export function okResponse<T extends z.ZodTypeAny>(
	response: unknown,
	schema?: T
): z.infer<T> | undefined {
	if (isOkResponse(response)) {
		return schema ? schema.parse(response) : undefined;
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

		pollingAdminSocketRegister(socket);
		pollingUserSocketRegister(socket);

		socket.on("connect", () => {
			assertHasSocket(socket);
			console.log(`connect (recovered=${socket.recovered})`);
			//if (!socket.recovered) {
			const groupId = selectSelectedGroupId(getState());
			dispatch(
				groupId
					? pollingSocketJoinGroup(groupId)
					: pollingSocketLeaveGroup()
			);
			//}
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
			const r = await pollingSocketEmit(
				"group:join",
				{ groupId } satisfies GroupJoin,
				groupJoinResponseSchema
			);
			const group = selectGroup(getState(), groupId);
			const access = group?.permissions.polling || AccessLevel.none;
			if (access >= AccessLevel.rw) {
				dispatch(pollingAdminSetEventId(r.eventId || null));
				dispatch(pollingAdminSetEvents(r.events));
				dispatch(pollingAdminSetPolls(r.polls));
			}
			const event = r.events.find((e) => e.id === r.eventId);
			dispatch(pollingUserSetEvent(event || null));
			dispatch(pollingUserSetPolls(r.polls));
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
