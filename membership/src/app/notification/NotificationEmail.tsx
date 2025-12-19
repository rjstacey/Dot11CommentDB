import React from "react";
import { Row, Col, Button, Spinner } from "react-bootstrap";
import { useParams } from "react-router";
import { convert } from "html-to-text";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { EmailTemplate } from "@/store/emailTemplates";
import { sendEmails, type Email } from "@/store/emailSend";
import { selectSelectedMembers, type Member } from "@/store/members";
import { selectUser, type User } from "@/store";
import { useEmailTemplateEdit } from "@/hooks/emailTemplateEdit";
import {
	useEmailSubstitution,
	genEmailAddress,
	substitutionTags,
	SELECTED_MEMBERS_KEY,
} from "@/hooks/emailSubstitutionTags";

import Editor from "@/components/editor/Editor";
import SelectEmailTemplate from "./SelectEmailTemplate";
import RecipientsEditor from "./RecipientsEditor";
import SubjectEditor from "./SubjectEditor";

import css from "./notification.module.css";

/** Generate email from template adding "Reply To:" and "To:" addresses if needed  */
function genEmail(email: EmailTemplate, user: User, member: Member) {
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
}

function NotificationEmail() {
	const { groupName } = useParams();
	const dispatch = useAppDispatch();
	const [preview, setPreview] = React.useState<EmailTemplate | null>(null);
	const [isPreview, setIsPreview] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	const user = useAppSelector(selectUser);
	const members = useAppSelector(selectSelectedMembers);

	const {
		emailTemplate,
		setEmailTemplate,
		changeEmailTemplate,
		deleteEmailTemplate,
	} = useEmailTemplateEdit(isPreview);

	const doSubstitution = useEmailSubstitution();

	React.useEffect(() => {
		if (!emailTemplate || members.length === 0) {
			setPreview(null);
		} else {
			const email = doSubstitution(emailTemplate, members[0]);
			setPreview(email);
		}
	}, [emailTemplate, members, doSubstitution]);

	function setTemplate(emailTemplate: EmailTemplate | null) {
		if (emailTemplate && !emailTemplate.to) {
			emailTemplate = { ...emailTemplate, to: SELECTED_MEMBERS_KEY };
		}
		setEmailTemplate(emailTemplate);
	}

	function togglePreview() {
		setIsPreview(!isPreview);
	}

	async function onSend() {
		const emails = members.map((member) => {
			const email = doSubstitution(emailTemplate!, member);
			return genEmail(email, user, member);
		});
		setBusy(true);
		// Send in batches of 50
		while (emails.length > 0) {
			const toSend = emails.splice(0, 50);
			await dispatch(sendEmails(groupName!, toSend));
		}
		setBusy(false);
	}

	const email = isPreview ? preview : emailTemplate;

	return (
		<>
			<Row className="m-2">
				<Col className="d-flex align-items-center gap-2">
					<div>Template</div>
					<SelectEmailTemplate
						value={emailTemplate}
						onChange={setTemplate}
					/>
					<Button
						variant="outline-danger"
						className="bi-trash"
						title="Delete template"
						onClick={deleteEmailTemplate}
						disabled={!emailTemplate}
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
						<Spinner size="sm" hidden={!busy} />
					</Button>
				</Col>
			</Row>
			{email && (
				<div className={css.emailContainer}>
					<RecipientsEditor
						email={email}
						onChange={changeEmailTemplate}
						readOnly={isPreview}
					/>
					<SubjectEditor
						value={email.subject}
						onChange={(subject) => changeEmailTemplate({ subject })}
						readOnly={isPreview}
					/>
					<Editor
						key={"" + isPreview + email.id}
						body={email.body}
						onChangeBody={(body) => changeEmailTemplate({ body })}
						tags={substitutionTags}
						readOnly={isPreview}
					/>
				</div>
			)}
		</>
	);
}

export default NotificationEmail;
