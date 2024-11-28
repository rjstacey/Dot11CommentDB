import { createSlice, PayloadAction, isPlainObject } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";
import z from "zod";
import { setError } from "dot11-components";
import { GroupJoin, PollingError, PollingOK } from "../schemas/poll";
import { AppThunk, RootState } from ".";
import { selectUser } from "./user";
import { pollingAdminEventsGet } from "./pollingAdmin";

/* Create slice */
const initialState: {
	isConnected: boolean;
	groupId: string | null;
} = {
	isConnected: false,
	groupId: null,
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
		setGroupId(state, action: PayloadAction<string | null>) {
			state.groupId = action.payload;
		},
	},
});

export default slice;

/** Slice actions */
const { setConnected, setDisconnected, setGroupId } = slice.actions;

/** Selectors */
const selectPollingSocketState = (state: RootState) => state[dataSet];
export const selectPollingSocketGroupId = (state: RootState) =>
	selectPollingSocketState(state).groupId;
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

function isOkResponse(response: any): response is PollingOK {
	return (
		isPlainObject(response) &&
		"status" in response &&
		response.status === "OK"
	);
}

function isErrorResponse(response: any): response is PollingError {
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
	schema: T
): z.infer<T>;
export function okResponse(response: unknown): undefined;
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
	data?: any
): Promise<undefined>;
export function pollingSocketEmit<T extends z.ZodTypeAny>(
	message: string,
	data?: any,
	schema?: T
): Promise<z.infer<T>>;
export function pollingSocketEmit<T extends z.ZodTypeAny>(
	message: string,
	data?: any,
	schema?: T
): Promise<z.infer<T> | undefined> {
	return new Promise((resolve) => {
		const socket = getSocket();
		socket.emit(message, data, (response: unknown) => {
			const result = schema
				? okResponse(response, schema)
				: okResponse(response);
			resolve(result);
		});
	});
}

export function handleError(error: any) {
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
		const user = selectUser(getState());
		socket = io("/poll", { query: { token: user.Token } });
		socket.on("connect", () => {
			console.log("connect");
			assertHasSocket(socket);
			if (socket.recovered) {
				const groupId = selectPollingSocketGroupId(getState());
				dispatch(
					groupId
						? pollingSocketJoinGroup(groupId)
						: pollingSocketLeaveGroup()
				);
			}
			dispatch(setConnected());
		});
	};

export const pollingSocketDisconnect =
	(): AppThunk => async (dispatch, getState) => {
		assertHasSocket(socket);
		dispatch(setDisconnected());
		socket.close();
	};

export const pollingSocketJoinGroup =
	(groupId: string): AppThunk =>
	async (dispatch) => {
		const params: GroupJoin = { groupId };
		try {
			await pollingSocketEmit("group:join", params);
			await dispatch(pollingAdminEventsGet(groupId));
		} catch (error: any) {
			dispatch(handleError(error));
		}
	};

export const pollingSocketLeaveGroup =
	(): AppThunk => async (dispatch, getState) => {
		try {
			await pollingSocketEmit("group:leave");
		} catch (error: any) {
			dispatch(handleError(error));
		}
	};
