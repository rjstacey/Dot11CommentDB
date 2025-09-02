import React from "react";

import { configureStore, combineReducers } from "@reduxjs/toolkit";
//import { createLogger } from "redux-logger";
import { Provider, useDispatch } from "react-redux";

import { errorsSlice, setError } from "../store/error";
import { ErrorModal, ConfirmModal } from "../modals";

const story = {
	title: "Modals",
};

const store = configureStore({
	reducer: combineReducers({ [errorsSlice.name]: errorsSlice.reducer }),
	//middleware: (getDM) => getDM().concat(createLogger({ collapsed: true })),
});

//type RootState = ReturnType<typeof store.getState>

const Content = () => (
	<form style={{ width: "200px" }}>
		<label>
			<input type="radio" id="1" />
			Fred
		</label>
		<br />
		<label>
			<input type="radio" id="2" />
			Frog
		</label>
		<br />
	</form>
);

type ErrorType = {
	summary: string;
	message: string;
};

let errId = 0;
function ErrorForm({
	err,
	setErr,
}: {
	err: ErrorType;
	setErr: (err: ErrorType) => void;
}) {
	const dispatch = useDispatch();

	function updateErr(changes: Partial<ErrorType>) {
		setErr({ ...err, ...changes });
	}
	const rowStyle = { display: "flex", margin: 5 };
	errId += 1;
	return (
		<div style={{ display: "flex", margin: 5 }}>
			<div style={rowStyle}>
				<label htmlFor={"s" + errId}>Summary:</label>
				<input
					id={"s" + errId}
					type="text"
					value={err.summary}
					onChange={(e) => updateErr({ summary: e.target.value })}
				/>
			</div>
			<div style={rowStyle}>
				<label htmlFor={"m" + errId}>Message:</label>
				<input
					id={"m" + errId}
					type="text"
					value={err.message}
					onChange={(e) => updateErr({ message: e.target.value })}
				/>
			</div>
			<button
				onClick={() => dispatch(setError(err.summary, err.message))}
			>
				send
			</button>
		</div>
	);
}

function MultipleErrors() {
	const dispatch = useDispatch();
	const [err1, setErr1] = React.useState<ErrorType>({
		summary: "Error 1",
		message: "Message 1",
	});
	const [err2, setErr2] = React.useState<ErrorType>({
		summary: "Error 2",
		message: "Message 2",
	});

	function sendAll() {
		dispatch(setError(err1.summary, err1.message));
		dispatch(setError(err2.summary, err2.message));
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
			}}
		>
			<ErrorForm err={err1} setErr={setErr1} />
			<ErrorForm err={err2} setErr={setErr2} />
			<div style={{ display: "flex", alignItems: "center" }}>
				<button onClick={sendAll}>Send all</button>
			</div>
		</div>
	);
}

const Error = () => (
	<Provider store={store}>
		<MultipleErrors />
		<ErrorModal />
	</Provider>
);

Error.parameters = {
	controls: { hideNoControlsWarning: true },
};

const Confirm = () => {
	const [action, setAction] = React.useState("");
	const check = async () => {
		const ok = await ConfirmModal.show("Are you sure?");
		setAction(ok ? "done" : "not done");
	};
	return (
		<>
			<button onClick={check}>Do it!</button>
			<span>&nbsp;{action}</span>
			<ConfirmModal />
		</>
	);
};

Confirm.parameters = {
	controls: { hideNoControlsWarning: true },
};

export { Error, Confirm };
export default story;
