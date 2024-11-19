import { createSlice } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";
import { AppThunk } from ".";
import { selectUser } from "./user";

/* Create slice */
const initialState: {
	isConnected: boolean;
} = {
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

/** Thunk actions */
let socket: Socket | undefined = undefined;

function hasSocket(socket: Socket | undefined): asserts socket is Socket {
	if (!socket) throw new Error("no socket");
}

export const pollingSocketConnect =
	(): AppThunk => async (dispatch, getState) => {
		const user = selectUser(getState());
		socket = io("/poll", { query: { token: user.Token } });
		socket.on("connect", () => console.log("connect"));
	};

export const pollingSocketDisconnect =
	(): AppThunk => async (dispatch, getState) => {
		hasSocket(socket);
		socket.close();
	};
