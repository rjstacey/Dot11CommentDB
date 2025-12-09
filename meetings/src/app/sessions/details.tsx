import * as React from "react";
import { Button } from "react-bootstrap";

import { selectUserSessionsAccess, AccessLevel } from "@/store/sessions";

import { SessionEditForm } from "./SessionEditForm";
import { SessionAddForm } from "./SessionAddForm";

import ShowAccess from "@/components/ShowAccess";
import { useAppSelector } from "@/store/hooks";
import { useSessionsEdit } from "@/edit/sessionsEdit";

export function SessionsDetails() {
	const access = useAppSelector(selectUserSessionsAccess);
	const readOnly = access <= AccessLevel.ro;

	const {
		state,
		submit,
		cancel,
		onChange,
		hasChanges,
		onAdd,
		onDelete,
		disableAdd,
		disableDelete,
	} = useSessionsEdit(readOnly);

	let actions: React.ReactNode = null;
	if (!readOnly) {
		actions = (
			<>
				<Button
					variant="outline-primary"
					className="bi-plus-lg"
					title="Add a session"
					disabled={disableAdd}
					onClick={onAdd}
				>
					{" Add"}
				</Button>
				<Button
					variant="outline-primary"
					className="bi-trash"
					title="Delete session"
					disabled={disableDelete}
					onClick={onDelete}
				>
					{" Delete"}
				</Button>
			</>
		);
	}

	let content: JSX.Element;
	if (state.action === "add") {
		content = (
			<SessionAddForm
				submit={submit}
				cancel={cancel}
				edited={state.edited}
				onChange={onChange}
			/>
		);
	} else if (state.action === "update") {
		content = (
			<SessionEditForm
				edited={state.edited}
				saved={state.saved}
				onChange={onChange}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else {
		content = <div className="placeholder">{state.message}</div>;
	}

	return (
		<>
			<div className="top-row justify-right gap-2">{actions}</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}
