import React from "react";
import { Row, Col, Button, Spinner } from "react-bootstrap";
import { useParams } from "react-router";
import { convert } from "html-to-text";
import { Select, SelectRendererProps } from "@components/select";
import { shallowDiff, displayDateRange, useDebounce } from "@components/lib";
import { ConfirmModal } from "@components/modals";

import Editor from "@/components/editor/Editor";
import { htmlWithInlineStyle } from "@/components/editor/utils";

import { useRenderSessionAttendances } from "../sessionParticipation/renderSessionAttendances";
import { useRenderBallotParticipation } from "../ballotParticipation/renderBallotParticipation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	addEmailTemplate,
	selectEmailTemplatesState,
	updateEmailTemplate,
	deleteEmailTemplate,
	EmailTemplateCreate,
	EmailTemplate,
} from "@/store/emailTemplates";
import { sendEmails, type Email } from "@/store/emailSend";
import {
	selectSelectedMembers,
	fields,
	type Member,
	getField,
} from "@/store/members";
import { selectMostRecentAttendedSession } from "@/store/sessions";
import { type Session } from "@/store/sessions";
import { selectUser, type User } from "@/store/user";

import RecipientsEditor from "./RecipientsEditor";
import SubjectEditor from "./SubjectEditor";
import css from "./notification.module.css";

const SELECTED_MEMBERS = "SelectedMembers";
const SELECTED_MEMBERS_KEY = `{{${SELECTED_MEMBERS}}}`;

const genEmailAddress = (m: Member | User) => `${m.Name} <${m.Email}>`;

const substitutionTags = Object.keys(fields).concat(
	"SessionName",
	"SessionNumber",
	"SessionDate"
);

function substitute(
	key: string,
	member: Member,
	session: Session | undefined,
	renderSessionAttendances: ReturnType<typeof useRenderSessionAttendances>,
	renderBallotParticipation: ReturnType<typeof useRenderBallotParticipation>
): string {
	if (Object.keys(member).includes(key))
		return "" + member[key as keyof Member] || "(Blank)";

	if (key === "OldStatus") return "" + (getField(member, key) || "(Blank)");

	if (key === "AttendancesSummary")
		return renderSessionAttendances(member.SAPIN);

	if (key.startsWith("Session")) {
		if (!session) return "(Blank)";
		let s = "";
		if (key === "SessionName") s = session.name;
		if (key === "SessionNumber") s = "" + session.number;
		if (key === "SessionDate")
			s = displayDateRange(session.startDate, session.endDate);
		return s || "(Blank)";
	}

	if (key === "BallotParticipationSummary")
		return renderBallotParticipation(member.SAPIN);

	console.log(`Error: Invalid key {{${key}}}`);

	return "";
}

const SUBSTITUTION_TAG_PATTERN = "{{([A-Za-z_-]+)}}";

function doSubstitution(
	email: EmailTemplate,
	member: Member,
	session: Session | undefined,
	renderSessionAttendances: ReturnType<typeof useRenderSessionAttendances>,
	renderBallotParticipation: ReturnType<typeof useRenderBallotParticipation>
) {
	let to = email.to || SELECTED_MEMBERS_KEY;
	to = to.replace(SELECTED_MEMBERS_KEY, genEmailAddress(member));
	email = { ...email, to };

	if (email.cc) {
		const cc = email.cc.replace(
			SELECTED_MEMBERS_KEY,
			genEmailAddress(member)
		);
		email = { ...email, cc };
	}

	if (email.bcc) {
		const bcc = email.bcc.replace(
			SELECTED_MEMBERS_KEY,
			genEmailAddress(member)
		);
		email = { ...email, bcc };
	}

	let bodyRemaining = email.body;
	let body = "";
	const regexp = new RegExp(SUBSTITUTION_TAG_PATTERN);
	while (bodyRemaining.length > 0) {
		const match = regexp.exec(bodyRemaining);
		if (match === null) break;
		body += bodyRemaining.substring(0, match.index);
		body += substitute(
			match[1],
			member,
			session,
			renderSessionAttendances,
			renderBallotParticipation
		);
		bodyRemaining = bodyRemaining.substring(match.index + match[0].length);
	}
	body += bodyRemaining;

	body = htmlWithInlineStyle(body);
	email = { ...email, body };
	return email;
}

function genEmails({
	user,
	emailTemplate,
	members,
	session,
	renderSessionAttendances,
	renderBallotParticipation,
}: {
	user: User;
	emailTemplate: EmailTemplate;
	members: Member[];
	session: Session | undefined;
	renderSessionAttendances: ReturnType<typeof useRenderSessionAttendances>;
	renderBallotParticipation: ReturnType<typeof useRenderBallotParticipation>;
}) {
	return Promise.all(
		members.map(async (member) => {
			const email = doSubstitution(
				emailTemplate,
				member,
				session,
				renderSessionAttendances,
				renderBallotParticipation
			);

			const html = email.body;
			const text = convert(html);

			const ToAddresses = email.to ? email.to.split(";") : [member.Email];
			const CcAddresses = email.cc ? email.cc.split(";") : undefined;
			const BccAddresses = email.bcc ? email.bcc.split(";") : undefined;

			const Charset = "UTF-8";
			const emailOut: Email = {
				Destination: { ToAddresses, CcAddresses, BccAddresses },
				Message: {
					Subject: { Charset, Data: email.subject },
					Body: {
						Html: { Charset, Data: html },
						Text: { Charset, Data: text },
					},
				},
				ReplyToAddresses: [genEmailAddress(user)],
			};

			return emailOut;
		})
	);
}

function SelectEmailTemplate({
	value,
	onChange,
}: {
	value: EmailTemplate | null;
	onChange: (value: EmailTemplate | null) => void;
}) {
	const dispatch = useAppDispatch();
	const { ids, entities, loading } = useAppSelector(
		selectEmailTemplatesState
	);
	const options = ids.map((id) => entities[id]!);
	const values = value ? options.filter((o) => o.id === value.id) : [];

	async function createEmailTemplate({ state }: SelectRendererProps) {
		const template: EmailTemplateCreate = {
			name: state.search,
			to: SELECTED_MEMBERS_KEY,
			cc: null,
			bcc: null,
			subject: "",
			body: "",
		};
		const addedTemplate = await dispatch(addEmailTemplate(template));
		onChange(addedTemplate || null);
		return addedTemplate;
	}
	return (
		<Select
			values={values}
			options={options}
			loading={loading}
			onChange={(values) =>
				onChange(values.length > 0 ? values[0] : null)
			}
			createOption={createEmailTemplate}
			create
			valueField="id"
			labelField="name"
			placeholder="Select email template..."
		/>
	);
}

function NotificationEmail() {
	const { groupName } = useParams();
	const dispatch = useAppDispatch();
	const [edited, setEdited] = React.useState<EmailTemplate | null>(null);
	const [saved, setSaved] = React.useState<EmailTemplate | null>(null);
	const [preview, setPreview] = React.useState<EmailTemplate | null>(null);
	const [isPreview, setIsPreview] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	const user = useAppSelector(selectUser);
	const members = useAppSelector(selectSelectedMembers);
	const session = useAppSelector(selectMostRecentAttendedSession);
	const renderSessionAttendances = useRenderSessionAttendances();
	const renderBallotParticipation = useRenderBallotParticipation();

	React.useEffect(() => {
		if (!edited || members.length === 0) {
			setPreview(null);
		} else {
			const email = doSubstitution(
				edited,
				members[0],
				session,
				renderSessionAttendances,
				renderBallotParticipation
			);
			setPreview(email);
		}
	}, [
		edited,
		members,
		session,
		renderSessionAttendances,
		renderBallotParticipation,
	]);

	const debouncedSave = useDebounce(() => {
		const changes = shallowDiff(saved!, edited!);
		dispatch(updateEmailTemplate({ id: saved!.id, changes }));
		setSaved(edited);
	});

	function setTemplate(emailTemplate: EmailTemplate | null) {
		debouncedSave.flush();
		if (emailTemplate && !emailTemplate.to) {
			emailTemplate = { ...emailTemplate, to: SELECTED_MEMBERS_KEY };
		}
		setEdited(emailTemplate);
		setSaved(emailTemplate);
	}

	function changeTemplate(changes: Partial<EmailTemplate>) {
		if (isPreview) return;
		setEdited((state) => ({ ...state!, ...changes }));
		debouncedSave();
	}

	async function deleteTemplate() {
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${edited!.name}?`
		);
		if (ok) {
			setTemplate(null);
			dispatch(deleteEmailTemplate(edited!.id));
		}
	}

	function togglePreview() {
		setIsPreview(!isPreview);
	}

	async function onSend() {
		setBusy(true);
		const emails = await genEmails({
			user,
			emailTemplate: saved!,
			members,
			session,
			renderSessionAttendances,
			renderBallotParticipation,
		});
		// Send in batches of 50
		while (emails.length > 0) {
			const toSend = emails.splice(0, 50);
			await dispatch(sendEmails(groupName!, toSend));
		}
		setBusy(false);
	}

	const email = isPreview ? preview : edited;

	return (
		<>
			<Row className="m-2">
				<Col className="d-flex align-items-center gap-2">
					<div>Template</div>
					<SelectEmailTemplate value={saved} onChange={setTemplate} />
					<Button
						variant="outline-danger"
						className="bi-trash"
						title="Delete template"
						onClick={deleteTemplate}
						disabled={!edited}
					/>
				</Col>
				<Col className="d-flex justify-content-end gap-2">
					<Button
						variant="outline-secondary"
						onClick={togglePreview}
						active={isPreview}
						className="d-inline-flex gap-2"
					>
						<i className="bi-eye" />
						<span>Preview</span>
					</Button>
					<Button
						variant="outline-secondary"
						onClick={onSend}
						className="d-inline-flex gap-2"
					>
						<i className="bi-send" />
						<span>Send</span>
						<Spinner
							size="sm"
							style={{ visibility: busy ? "visible" : "hidden" }}
						/>
					</Button>
				</Col>
			</Row>
			{email && (
				<div className={css.emailContainer}>
					<RecipientsEditor
						email={email}
						onChange={changeTemplate}
						readOnly={isPreview}
					/>
					<SubjectEditor
						value={email.subject}
						onChange={(subject) => changeTemplate({ subject })}
						readOnly={isPreview}
					/>
					<Editor
						key={"" + isPreview + email.id}
						body={email.body}
						onChangeBody={(body) => changeTemplate({ body })}
						tags={substitutionTags}
						readOnly={isPreview}
					/>
				</div>
			)}
		</>
	);
}

export default NotificationEmail;
