import * as React from "react";

import {
	Button,
	Form,
	Row,
	FieldLeft,
	Field,
	Input,
	ConfirmModal,
	ActionButtonModal,
} from "dot11-components";

import { BallotComments } from "./Ballots";
import MemberSelector from "../voters/MemberSelector";

import { useAppDispatch } from "../store/hooks";
import {
	importComments,
	uploadComments,
	deleteComments,
	setStartCommentId,
	uploadUserComments,
	uploadPublicReviewComments,
} from "../store/comments";
import { getBallotId, Ballot, BallotType } from "../store/ballots";

function ChangeStartCID({
	ballot,
	close = () => {},
}: {
	ballot: Ballot;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [startCID, setStartCID] = React.useState<string>(
		"" + (ballot.Comments?.CommentIDMin || 1)
	);
	const [errorText, setErrorText] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	console.log(ballot, startCID);

	const submit = async () => {
		setBusy(true);
		await dispatch(setStartCommentId(ballot.id, Number(startCID)));
		setBusy(false);
		close();
	};

	const change: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const { value } = e.target;
		setErrorText(/\d*/.test(value) ? "" : "Must be a number");
		setStartCID(value);
	};

	return (
		<Form
			style={{ minWidth: 300 }}
			title="Change starting CID"
			submit={submit}
			errorText={errorText}
			cancel={close}
			busy={busy}
		>
			<Row style={{ marginBottom: 20 }}>
				<Field label="Start CID:">
					<Input
						type="search"
						width={6}
						value={startCID}
						onChange={change}
					/>
				</Field>
			</Row>
		</Form>
	);
}

function AddMemberComments({
	ballot,
	close = () => {},
}: {
	ballot: Ballot;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [commenterSAPIN, setCommenterSAPIN] = React.useState<number | null>(
		null
	);
	const [busy, setBusy] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (
		e
	) => {
		const { files } = e.target;
		setFile(files && files.length > 0 ? files[0] : null);
	};

	const submit = async () => {
		if (errorText) return;
		setBusy(true);
		await dispatch(uploadUserComments(ballot.id, commenterSAPIN!, file!));
		setBusy(false);
		close();
	};

	let errorText = "";
	if (!commenterSAPIN) errorText = "Select commenter";
	else if (!file) errorText = "Select file";

	return (
		<Form
			style={{ minWidth: 300 }}
			title="Add additional member comments"
			submit={submit}
			errorText={errorText}
			cancel={close}
			busy={busy}
		>
			<Row>
				<Field label="Commenter:">
					<MemberSelector
						value={commenterSAPIN || 0}
						onChange={setCommenterSAPIN}
					/>
				</Field>
			</Row>
			<Row>
				<input
					type="file"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={handleFileChange}
				/>
			</Row>
		</Form>
	);
}

function AddPublicReviewComments({
	ballot,
	close = () => {},
}: {
	ballot: Ballot;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (
		e
	) => {
		const { files } = e.target;
		setFile(files && files.length > 0 ? files[0] : null);
	};

	const submit = async () => {
		if (errorText) return;
		setBusy(true);
		await dispatch(uploadPublicReviewComments(ballot.id, file!));
		setBusy(false);
		close();
	};

	let errorText = "";
	if (!file) errorText = "Select file";

	return (
		<Form
			style={{ minWidth: 300 }}
			title="Add public review comments"
			submit={submit}
			errorText={errorText}
			cancel={close}
			busy={busy}
		>
			<Row>
				<input
					type="file"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={handleFileChange}
				/>
			</Row>
		</Form>
	);
}

const CommentsActions = ({
	ballot,
	setBusy,
	readOnly,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) => {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	async function handleDeleteComments() {
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete comments for ${getBallotId(ballot)}?`
		);
		if (!ok) return;
		setBusy(true);
		await dispatch(deleteComments(ballot.id));
		setBusy(false);
	}

	const handleImportComments = async () => {
		setBusy(true);
		await dispatch(importComments(ballot.id, 1));
		setBusy(false);
	};

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
		e
	) => {
		setInputValue(e.target.value);
		const { files } = e.target;
		if (files && files.length > 0) {
			setBusy(true);
			await dispatch(uploadComments(ballot.id, files[0]));
			setBusy(false);
			setInputValue("");
		}
	};

	return (
		<>
			<Row>
				<FieldLeft label="Comments:">
					<BallotComments ballot={ballot} />
				</FieldLeft>
			</Row>
			{!readOnly && (
				<Row style={{ justifyContent: "flex-start" }}>
					<Button
						onClick={handleDeleteComments}
						disabled={
							ballot.Comments && ballot.Comments.Count === 0
						}
					>
						Delete
					</Button>
					<ActionButtonModal
						label="Change starting CID"
						disabled={
							ballot.Comments && ballot.Comments.Count === 0
						}
					>
						<ChangeStartCID ballot={ballot!} />
					</ActionButtonModal>
					{ballot.Type !== BallotType.SA && ballot.EpollNum ? (
						<Button onClick={handleImportComments}>
							{(ballot.Comments?.Count ? "Reimport" : "Import") +
								" from ePoll"}
						</Button>
					) : null}
					<Button onClick={() => fileRef.current?.click()}>
						Upload comments
					</Button>
					<ActionButtonModal
						label="Add member comments"
						disabled={
							ballot.Comments && ballot.Comments.Count === 0
						}
					>
						<AddMemberComments ballot={ballot} />
					</ActionButtonModal>
					{ballot.Type === BallotType.SA ? (
						<ActionButtonModal
							label="Add public review comments"
							disabled={
								ballot.Comments && ballot.Comments.Count === 0
							}
						>
							<AddPublicReviewComments ballot={ballot} />
						</ActionButtonModal>
					) : null}
					<input
						ref={fileRef}
						type="file"
						style={{ display: "none" }}
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						value={inputValue} // necessary otherwise with the same file selected there is no onChange call
						onChange={handleFileChange}
					/>
				</Row>
			)}
		</>
	);
};

export default CommentsActions;
