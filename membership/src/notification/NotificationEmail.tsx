import * as React from "react";
import { Html } from "@react-email/html";
import { render } from "@react-email/render";
import {
	Form,
	Select,
	Row,
	Field,
	Button,
	SelectRendererProps,
	shallowDiff,
	displayDateRange,
	ActionButton,
	ConfirmModal,
	useDebounce
} from "dot11-components";

import Editor, {replaceClassWithInlineStyle} from "../editor/Editor";
import { genSessionAttendanceTableHtml } from "../sessionParticipation/MemberAttendances";

import type { RootState } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	addEmailTemplate,
	selectEmailTemplatesState,
	updateEmailTemplate,
	deleteEmailTemplate,
	sendEmail,
	type EmailTemplateCreate,
	type EmailTemplate,
	type Email,
} from "../store/email";
import { selectMembersState, type Member } from "../store/members";
import { selectMostRecentAttendedSession } from "../store/sessionParticipation";
import { selectUser, type User } from "../store/user";

function substitute(key: string, member: Member, state: RootState): string {
	console.log(key, Object.keys(member))
	if (Object.keys(member).includes(key)) {
		return "" + member[key as keyof Member] || "(Blank)";
	}

	if (key.startsWith('Session')) {
		if (key === 'SessionAttendance')
			return genSessionAttendanceTableHtml(state, member.SAPIN);

		const session = selectMostRecentAttendedSession(state);
		if (!session) return "(Blank)"
		let s = "";
		if (key === 'SessionName')
			s = session.name;
		if (key === 'SessionNumber')
			s = "" + session.number;
		if (key === 'SessionDate')
			s = displayDateRange(session.startDate, session.endDate);
		return s || "(Blank)";
	}

	return "(Not implemented)";
}

function doSubstitution(
	email: EmailTemplate,
	member: Member,
	state: RootState
) {
	let body = email.body;
	const m = body.match(/{{[a-zA-Z]+}}/g);
	console.log(m)
	if (m) {
		for (let i = 0; i < m.length; i++) {
			const key = m[i].replace('{{', '').replace('}}', '');
			body = body.replace(`{{${key}}}`, substitute(key, member, state))
		}
	}

	body = replaceClassWithInlineStyle(body);

	return { ...email, body };
}

const genEmailAddress = (m: Member | User) => `${m.Name} <${m.Email}>`;

function genEmails({
	emailTemplate,
	members,
	state
}: {
	emailTemplate: EmailTemplate;
	members: Member[];
	state: RootState;
}) {
	const user = selectUser(state);
	return members.map((member) => {
		const email = doSubstitution(emailTemplate, member, state);

		const html = render(<FormatBody body={email.body} />);

		const emailOut: Email = {
			Destination: {
				CcAddresses: [genEmailAddress(user)],
				ToAddresses: [genEmailAddress(member)],
			},
			Message: {
				Subject: {
					Charset: "UTF-8",
					Data: email.subject,
				},
				Body: {
					Html: {
						Charset: "UTF-8",
						Data: html,
					},
					Text: {
						Charset: "UTF-8",
						Data: email.body,
					},
				},
			},
			ReplyToAddresses: [genEmailAddress(user)],
		};

		return emailOut;
	});
}

function FormatBody({
	body
}: {
	body: string;
}) {
	return (
		<Html lang="en" dir="ltr" dangerouslySetInnerHTML={{__html: body}} />
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
	const dispatch = useAppDispatch();
	const [edited, setEdited] = React.useState<EmailTemplate | null>(null);
	const [saved, setSaved] = React.useState<EmailTemplate | null>(null);
	const [preview, setPreview] = React.useState(false);

	const { selected, entities } = useAppSelector(selectMembersState);
	const members = selected.map((id) => entities[id]).filter(m => Boolean(m)) as Member[];
	const state = useAppSelector(state => state);

	const debouncedSave = useDebounce(() => {
		const changes = shallowDiff(saved!, edited!);
		dispatch(updateEmailTemplate({ id: saved!.id, changes }));
		setSaved(edited);
	});

	function setTemplate(emailTemplate: EmailTemplate | null) {
		debouncedSave.flush();
		setEdited(emailTemplate);
		setSaved(emailTemplate);
	}

	function changeTemplate(changes: Partial<EmailTemplate>) {
		if (preview)
			return;
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
		if (!edited)
			return;
		if (!preview) {
			debouncedSave.flush();
			const email = doSubstitution(edited, members[0], state);
			setEdited(email);
		}
		else {
			setEdited(saved);
		}
		setPreview(!preview);
	}

	function onSend() {
		genEmails({ emailTemplate: saved!, members, state }).forEach((email) =>
			dispatch(sendEmail(email))
		);
	}

	return (
		<Form style={{ margin: 10, maxWidth: 1000 }}>
			<Row>
				<div style={{ display: "flex" }}>
					<Field label="Template">
					<SelectEmailTemplate
						value={saved}
						onChange={setTemplate}
					/>
					<ActionButton
						name="delete"
						title="Delete template"
						onClick={deleteTemplate}
						disabled={!edited}
					/>
					</Field>
				</div>
				<div>
					<Button
						onClick={togglePreview}
						isActive={preview}
					>
						<i className="bi-eye" />
						<span>&nbsp;Preview</span>
					</Button>
					<Button
						onClick={onSend}
					>
						<i className="bi-send" />
						<span>&nbsp;Send</span>
					</Button>
				</div>
			</Row>
			{edited && (
				<Row>
						<Editor
							key={"" + preview + edited.id}
							subject={edited.subject}
							body={edited.body}
							onChangeSubject={(subject) => changeTemplate({ subject })}
							onChangeBody={(body) => changeTemplate({ body })}
							preview={preview}
						/>
				</Row>
			)}
		</Form>
	);
}

export default NotificationEmail;
