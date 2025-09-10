import * as React from "react";
import { Row, Col, Form, Button, DropdownButton } from "react-bootstrap";
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
	const [startCID, setStartCID] = React.useState<number | null>(
		ballot.Comments?.CommentIDMin || null
	);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setBusy(true);
		await dispatch(setStartCommentId(ballot.id, Number(startCID)));
		setBusy(false);
		close();
	};

	const change = (e: React.ChangeEvent<HTMLInputElement>) => {
		const n = Number(e.target.value) || null;
		setStartCID(n);
	};

	const formValid = !!startCID;

	return (
		<Form onSubmit={handleSubmit} className="p-4">
			<Form.Group as={Row} className="mb-5">
				<Form.Label>Start CID:</Form.Label>
				<Col>
					<Form.Control
						type="search"
						value={startCID || ""}
						onChange={change}
						pattern="/\d+/"
						isInvalid={!startCID}
					/>
					<Form.Control.Feedback
						type="invalid"
						className="position-absolute"
					>
						Enter number for first CID
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end gap-2">
					<Button variant="secondary" type="button" onClick={close}>
						Cancel
					</Button>
					<Button type="submit" disabled={!formValid}>
						Change
					</Button>
				</Col>
			</Row>
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
			title="Change start CID"
			show={show}
			onToggle={() => setShow(!show)}
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
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		const { files } = e.target;
		if (files && files.length > 0) {
			setBusy(true);
			await dispatch(uploadComments(ballot.id, files[0]));
			setBusy(false);
			setInputValue("");
		}
	};

	if (ballot.Type !== BallotType.SA) return null;

	return (
		<>
			<Button
				variant="light"
				title=""
				disabled={ballot.Comments && ballot.Comments.Count === 0}
				onClick={() => fileRef.current?.click()}
			>
				Upload comments
			</Button>
			<input
				ref={fileRef}
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
	const [file, setFile] = React.useState<File | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { files } = e.target;
		setFile(files && files.length > 0 ? files[0] : null);
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
			style={{ minWidth: 400 }}
			title="Add additional member comments"
			onSubmit={handleSubmit}
			className="p-4"
		>
			<Form.Group as={Row} className="mb-3">
				<Form.Label htmlFor="commenter">Commenter:</Form.Label>
				<MemberSelector
					id="commenter"
					value={commenterSAPIN || 0}
					onChange={setCommenterSAPIN}
				/>
				<Form.Control hidden isInvalid={!commenterSAPIN} />
				<Form.Control.Feedback type="invalid">
					Select commenter
				</Form.Control.Feedback>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Control
					type="file"
					accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={handleFileChange}
					isInvalid={!file}
				/>
				<Form.Control.Feedback type="invalid">
					Select spreadsheet file
				</Form.Control.Feedback>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-end gap-2">
					<Button variant="secondary" type="button" onClick={close}>
						Cancel
					</Button>
					<Button type="submit">Add</Button>
				</Col>
			</Row>
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
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		const { files } = e.target;
		if (files && files.length > 0) {
			setBusy(true);
			await dispatch(uploadPublicReviewComments(ballot.id, files[0]));
			setBusy(false);
			setInputValue("");
		}
	};

	if (ballot.Type !== BallotType.SA) return null;

	return (
		<>
			<Button
				variant="light"
				title=""
				disabled={ballot.Comments && ballot.Comments.Count === 0}
				onClick={() => fileRef.current?.click()}
			>
				Add public review comments
			</Button>
			<input
				ref={fileRef}
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
		<Row className="align-items-center mb-3">
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
