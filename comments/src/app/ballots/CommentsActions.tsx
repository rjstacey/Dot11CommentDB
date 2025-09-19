import * as React from "react";
import { Row, Col, Form, Button, DropdownButton } from "react-bootstrap";
import { ConfirmModal } from "@common";

import { BallotComments } from "./BallotComments";
import { MemberSelect } from "../voters/MemberSelect";

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
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

function ChangeStartCIDForm({
	ballot,
	setBusy,
	close = () => {},
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [startCID, setStartCID] = React.useState<string>(
		"" + (ballot.Comments?.CommentIDMin || 1)
	);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setBusy(true);
		await dispatch(setStartCommentId(ballot.id, Number(startCID)));
		setBusy(false);
		close();
	};

	const formValid = Number(startCID) > 0;

	return (
		<Form
			noValidate
			onSubmit={handleSubmit}
			className="p-4"
			style={{ minWidth: 250 }}
		>
			<Form.Group as={Row} className="mb-2">
				<Form.Label>Start CID:</Form.Label>
				<Col className="position-relative">
					<Form.Control
						type="search"
						value={startCID}
						onChange={(e) => setStartCID(e.target.value)}
						pattern="/\d+/"
						isInvalid={!formValid}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Enter number for first CID
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<SubmitCancelRow
				submitLabel="Change"
				cancel={close}
				disabled={!formValid}
			/>
		</Form>
	);
}

function ChangeStartCID({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const [show, setShow] = React.useState(false);
	return (
		<DropdownButton
			variant="light"
			drop="up"
			title="Change start CID"
			show={show}
			onToggle={() => setShow(!show)}
			disabled={ballot.Comments && ballot.Comments.Count === 0}
		>
			<ChangeStartCIDForm
				key={"start-cid-" + show} // re-mount when opened
				ballot={ballot}
				setBusy={setBusy}
				close={() => setShow(false)}
			/>
		</DropdownButton>
	);
}

function DeleteComments({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();

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

	return (
		<Button
			variant="light"
			onClick={handleDeleteComments}
			disabled={ballot.Comments && ballot.Comments.Count === 0}
		>
			Delete
		</Button>
	);
}

function ImportComments({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();

	const handleImportComments = async () => {
		if (ballot.Comments.Count) {
			const ok = await ConfirmModal.show(
				"Are you sure you want to replace the existing comments?"
			);
			if (!ok) return;
		}
		setBusy(true);
		await dispatch(importComments(ballot.id, 1));
		setBusy(false);
	};

	if (
		(ballot.Type !== BallotType.WG && ballot.Type !== BallotType.CC) ||
		!ballot.EpollNum
	)
		return null;

	const title =
		(ballot.Comments?.Count ? "Reimport" : "Import") + " from ePoll";

	return (
		<Button variant="light" onClick={handleImportComments}>
			{title}
		</Button>
	);
}

function UploadComments({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		const file = e.target.files?.[0];
		if (!file) return;
		if (ballot.Comments.Count) {
			const ok = await ConfirmModal.show(
				"Are you sure you want to replace the existing comments?"
			);
			if (!ok) return;
		}
		setBusy(true);
		await dispatch(uploadComments(ballot.id, file));
		setBusy(false);
		setInputValue("");
	};

	return (
		<>
			<Button
				variant="light"
				title=""
				onClick={() => inputRef.current?.click()}
			>
				Upload comments
			</Button>
			<input
				ref={inputRef}
				type="file"
				style={{ display: "none" }}
				accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				value={inputValue} // necessary otherwise with the same file selected there is no onChange call
				onChange={handleFileChange}
			/>
		</>
	);
}

function AddMemberCommentsForm({
	ballot,
	setBusy,
	close = () => {},
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [commenterSAPIN, setCommenterSAPIN] = React.useState<number | null>(
		null
	);
	const [file, setFile] = React.useState<File | undefined>();
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);

	React.useLayoutEffect(() => {
		const formValid = formRef.current?.checkValidity() || false;
		setFormValid(formValid);
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		setFile(file);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setBusy(true);
		await dispatch(uploadUserComments(ballot.id, commenterSAPIN!, file!));
		setBusy(false);
		close();
	};

	return (
		<Form
			ref={formRef}
			noValidate
			validated
			style={{ minWidth: 400 }}
			title="Add additional member comments"
			onSubmit={handleSubmit}
			className="p-4"
		>
			<Form.Group as={Row} className="mb-4">
				<Form.Label htmlFor="add-comments-commenter">
					Commenter:
				</Form.Label>
				<Col className="position-relative">
					<MemberSelect
						id="add-comments-commenter"
						value={commenterSAPIN || 0}
						onChange={setCommenterSAPIN}
						isInvalid={!commenterSAPIN}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Select commenter
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-4">
				<Col className="position-relative">
					<Form.Control
						type="file"
						id="add-comments-file"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						onChange={handleFileChange}
						required
						isInvalid={!file}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Select spreadsheet file
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<SubmitCancelRow
				submitLabel="Add"
				cancel={close}
				disabled={!formValid}
			/>
		</Form>
	);
}

function AddMemberComments({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const [show, setShow] = React.useState(false);
	return (
		<DropdownButton
			variant="light"
			drop="up"
			title="Add member comments"
			show={show}
			onToggle={() => setShow(!show)}
		>
			<AddMemberCommentsForm
				ballot={ballot}
				setBusy={setBusy}
				close={() => setShow(false)}
			/>
		</DropdownButton>
	);
}

function AddPublicReviewComments({
	ballot,
	setBusy,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		const file = e.target.files?.[0];
		if (!file) return;
		setBusy(true);
		await dispatch(uploadPublicReviewComments(ballot.id, file));
		setBusy(false);
		setInputValue("");
	};

	if (ballot.Type !== BallotType.SA) return null;

	return (
		<>
			<Button
				variant="light"
				title=""
				disabled={ballot.Comments && ballot.Comments.Count === 0}
				onClick={() => inputRef.current?.click()}
			>
				Add public review comments
			</Button>
			<input
				ref={inputRef}
				type="file"
				style={{ display: "none" }}
				accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				value={inputValue} // necessary otherwise with the same file selected there is no onChange call
				onChange={handleFileChange}
			/>
		</>
	);
}

function CommentsActions({
	ballot,
	setBusy,
	readOnly,
}: {
	ballot: Ballot;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	return (
		<Row className="align-items-center mb-2">
			<Form.Label column xs="auto">
				Comments:
			</Form.Label>
			<Col xs="auto">
				<BallotComments ballot={ballot} />
			</Col>
			{!readOnly && (
				<Col
					xs={12}
					className="d-flex flex-row flex-wrap justify-content-start gap-2"
				>
					<DeleteComments ballot={ballot} setBusy={setBusy} />
					<ChangeStartCID ballot={ballot!} setBusy={setBusy} />
					<ImportComments ballot={ballot} setBusy={setBusy} />
					<UploadComments ballot={ballot} setBusy={setBusy} />
					<AddMemberComments ballot={ballot} setBusy={setBusy} />
					<AddPublicReviewComments
						ballot={ballot}
						setBusy={setBusy}
					/>
				</Col>
			)}
		</Row>
	);
}

export default CommentsActions;
