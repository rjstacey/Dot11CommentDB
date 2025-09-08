import * as React from "react";
import { Row, Col, Form, Button, Spinner, Dropdown } from "react-bootstrap";
import { ConfirmModal } from "@common";

import { BallotComments } from "./BallotComments";
import MemberSelector from "../voters/MemberSelector";

import { useAppDispatch } from "@/store/hooks";
import {
	importComments,
	uploadComments,
	deleteComments,
	setStartCommentId,
	uploadUserComments,
	uploadPublicReviewComments,
} from "@/store/comments";
import { getBallotId, Ballot, BallotType } from "@/store/ballots";

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

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
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
			onSubmit={handleSubmit}
		>
			<Row style={{ marginBottom: 20 }}>
				<Form.Label>Start CID:</Form.Label>
				<Form.Control
					type="search"
					width={6}
					value={startCID}
					onChange={change}
				/>
				<Form.Control.Feedback type="invalid">
					{errorText}
				</Form.Control.Feedback>
			</Row>
			<Row>
				<Button type="submit">
					{busy ? <Spinner animation="border" size="sm" /> : "OK"}
				</Button>
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

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
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
			onSubmit={handleSubmit}
		>
			<Row>
				<Form.Label>Commenter:</Form.Label>
				<MemberSelector
					value={commenterSAPIN || 0}
					onChange={setCommenterSAPIN}
				/>
			</Row>
			<Row>
				<Form.Control
					type="file"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={handleFileChange}
				/>
			</Row>
			<Row>
				<Button type="submit">
					{busy ? <Spinner animation="border" size="sm" /> : "OK"}
				</Button>
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

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
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
			onSubmit={handleSubmit}
		>
			<Row>
				<Form.Control
					type="file"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={handleFileChange}
				/>
				<Form.Control.Feedback type="invalid">
					{errorText}
				</Form.Control.Feedback>
			</Row>
			<Row>
				<Button type="submit">
					{busy ? <Spinner animation="border" size="sm" /> : "OK"}
				</Button>
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
			`Are you sure you want to delete comments for ${getBallotId(
				ballot
			)}?`
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
				<Col>
					<Form.Label>Comments:</Form.Label>
					<BallotComments ballot={ballot} />
				</Col>
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
					<Dropdown>
						<Dropdown.Toggle>Change starting CID</Dropdown.Toggle>
						<Dropdown.Menu>
							<ChangeStartCID ballot={ballot!} />
						</Dropdown.Menu>
					</Dropdown>
					{ballot.Type !== BallotType.SA && ballot.EpollNum ? (
						<Button onClick={handleImportComments}>
							{(ballot.Comments?.Count ? "Reimport" : "Import") +
								" from ePoll"}
						</Button>
					) : null}
					<Button onClick={() => fileRef.current?.click()}>
						Upload comments
					</Button>
					<Dropdown>
						<Dropdown.Toggle>Add member comments</Dropdown.Toggle>
						<Dropdown.Menu>
							<AddMemberComments ballot={ballot} />
						</Dropdown.Menu>
					</Dropdown>
					{ballot.Type === BallotType.SA ? (
						<Dropdown>
							<Dropdown.Toggle
								disabled={
									ballot.Comments &&
									ballot.Comments.Count === 0
								}
							>
								Add public review comments
							</Dropdown.Toggle>
							<Dropdown.Menu>
								<AddPublicReviewComments ballot={ballot} />
							</Dropdown.Menu>
						</Dropdown>
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
