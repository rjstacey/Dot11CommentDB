import * as React from "react";
import { Spinner, Button } from "react-bootstrap";
import { ConfirmModal, Multiple } from "@common";

import {
	deleteSessions,
	setSelected,
	selectSessionsState,
	selectUserSessionsAccess,
	Session,
	AccessLevel,
} from "@/store/sessions";

import { SessionEditForm } from "./SessionEditForm";
import { SessionAddForm } from "./SessionAddForm";

import ShowAccess from "@/components/ShowAccess";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="placeholder">
		<span {...props} />
	</div>
);

export type MultipleSession = Multiple<Session>;

export function SessionDetail() {
	const dispatch = useAppDispatch();
	const access = useAppSelector(selectUserSessionsAccess);
	const { loading, valid, selected, entities } =
		useAppSelector(selectSessionsState);
	const selectedSessions = React.useMemo(() => {
		return selected.map((id) => entities[id]!).filter(Boolean);
	}, [selected, entities]);
	const [busy, setBusy] = React.useState(false);
	const [action, setAction] = React.useState<"add" | "update">("update");

	const readOnly = access <= AccessLevel.ro;

	function addClick() {
		setAction("add");
		dispatch(setSelected([]));
	}

	async function deleteClick() {
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the selected sessions?"
		);
		if (ok) dispatch(deleteSessions(selected));
	}

	let content: JSX.Element;
	if (action === "add") {
		content = (
			<SessionAddForm
				close={() => setAction("update")}
				setBusy={setBusy}
			/>
		);
	} else {
		let placeholder: string | null = null;
		if (!valid && loading) {
			placeholder = "Loading...";
		} else if (selectedSessions.length === 0) {
			placeholder = "Nothing selected";
		}
		if (placeholder) {
			content = <Placeholder>{placeholder}</Placeholder>;
		} else {
			content = (
				<SessionEditForm
					sessions={selectedSessions}
					setBusy={setBusy}
					readOnly={readOnly}
				/>
			);
		}
	}

	return (
		<>
			<div className="top-row justify-right gap-2">
				<Spinner style={{ visibility: busy ? "visible" : "hidden" }} />
				{!readOnly && (
					<>
						<Button
							variant="outline-primary"
							className="bi-plus-lg"
							title="Add a session"
							onClick={addClick}
						>
							{" Add"}
						</Button>
						<Button
							variant="outline-primary"
							className="bi-trash"
							title="Delete session"
							disabled={readOnly || selected.length === 0}
							onClick={deleteClick}
						>
							{" Delete"}
						</Button>
					</>
				)}
			</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}
