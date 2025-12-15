import React from "react";
import {
	Row,
	Col,
	Form,
	Button,
	DropdownButton,
	Spinner,
} from "react-bootstrap";
import { ConfirmModal } from "@common";

import { BallotComments } from "../BallotComments";
import { MemberSelect } from "../../voters/MemberSelect";

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
	close = () => {},
}: {
	ballot: Ballot;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [startCID, setStartCID] = React.useState<string>(
		"" + (ballot.Comments?.CommentIDMin || 1)
	);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
			onSubmit={onSubmit}
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
				busy={busy}
			/>
		</Form>
	);
}

function ChangeStartCID({ ballot }: { ballot: Ballot }) {
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
				close={() => setShow(false)}
			/>
		</DropdownButton>
	);
}

function DeleteComments({ ballot }: { ballot: Ballot }) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);

	async function onDelete() {
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
			onClick={onDelete}
			disabled={ballot.Comments && ballot.Comments.Count === 0}
		>
			<Spinner size="sm" hidden={!busy} className="me-2" />
			{"Delete"}
		</Button>
	);
}

function ImportComments({ ballot }: { ballot: Ballot }) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);

	const onImport = async () => {
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
		<Button variant="light" onClick={onImport}>
			<Spinner size="sm" hidden={!busy} className="me-2" />
			{title}
		</Button>
	);
}

function UploadComments({ ballot }: { ballot: Ballot }) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	const onChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
				<Spinner size="sm" hidden={!busy} className="me-2" />
				{"Upload comments"}
			</Button>
			<input
				ref={inputRef}
				type="file"
				style={{ display: "none" }}
				accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				value={inputValue} // necessary otherwise with the same file selected there is no onChange call
				onChange={onChangeFile}
			/>
		</>
	);
}

function AddMemberCommentsForm({
	ballot,
	close = () => {},
}: {
	ballot: Ballot;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
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

	const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		setFile(file);
	};

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
			onSubmit={onSubmit}
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
						onChange={onChangeFile}
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
				busy={busy}
			/>
		</Form>
	);
}

function AddMemberComments({ ballot }: { ballot: Ballot }) {
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
				close={() => setShow(false)}
			/>
		</DropdownButton>
	);
}

function AddPublicReviewComments({ ballot }: { ballot: Ballot }) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	const onChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
				<Spinner size="sm" hidden={!busy} className="me-2" />
				{"Add public review comments"}
			</Button>
			<input
				ref={inputRef}
				type="file"
				style={{ display: "none" }}
				accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				value={inputValue} // necessary otherwise with the same file selected there is no onChange call
				onChange={onChangeFile}
			/>
		</>
	);
}

function CommentsActions({
	ballot,
	readOnly,
}: {
	ballot: Ballot;
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
					<DeleteComments ballot={ballot} />
					<ChangeStartCID ballot={ballot} />
					<ImportComments ballot={ballot} />
					<UploadComments ballot={ballot} />
					<AddMemberComments ballot={ballot} />
					<AddPublicReviewComments ballot={ballot} />
				</Col>
			)}
		</Row>
	);
}

export default CommentsActions;
