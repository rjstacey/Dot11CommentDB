import * as React from "react";
import { Markdown } from "@react-email/markdown";
import { Html } from "@react-email/html";
import { render } from "@react-email/render";
import {
	Form,
	Select,
	Row,
	Field,
	Button,
	Input,
	SelectRendererProps,
	shallowDiff,
	displayDateRange,
	ActionButton,
	ConfirmModal,
} from "dot11-components";

import { useDebounce } from "../components/useDebounce";
import Editor from "../editor/Editor";

import { RootState } from "../store";
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
import { type Session } from "../store/sessions";
import { selectMostRecentAttendedSession } from "../store/sessionParticipation";
import { selectUser, type User } from "../store/user";

function selectEmailInfo(state: RootState) {
	const { selected, entities } = selectMembersState(state);
	const members = selected.map((id) => entities[id]!);
	const session = selectMostRecentAttendedSession(state);
	const user = selectUser(state);

	return {
		members,
		session,
		user,
	};
}

function doSubstitution(
	email: EmailTemplate,
	member: Member,
	session: Session
) {
	const sub: { [K: string]: string } = {
		FirstName: member.FirstName,
		LastName: member.LastName,
		Name: member.Name,
		Status: member.Status,
		SessionName: session.name,
		SessionNumber: "" + session.number,
		SessionDate: displayDateRange(session.startDate, session.endDate),
		BallotParticipation: "ballot participation",
	};

	let body = Object.entries(sub).reduce(
		(body, [key, value]) => body.replace(`{{${key}}}`, value),
		email.body
	);

	return { ...email, body };
}

const genEmailAddress = (m: Member | User) => `${m.Name} <${m.Email}>`;

function genEmails({
	emailTemplate,
	info,
}: {
	emailTemplate: EmailTemplate;
	info: ReturnType<typeof selectEmailInfo>;
}) {
	const { members, session, user } = info;

	return members.map((member) => {
		const email = doSubstitution(emailTemplate, member, session);

		const html = render(
			<Html lang="en" dir="ltr">
				<PreviewEmail value={email} info={info} />
			</Html>
		);

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

function FormatEmail({
	email,
	style,
}: {
	email: EmailTemplate;
	style?: React.CSSProperties;
}) {
	return (
		<Markdown
			markdownCustomStyles={{
				h1: { color: "red" },
				h2: { color: "blue" },
				codeInline: { background: "grey" },
			}}
			markdownContainerStyles={{
				padding: "12px",
				border: "solid 1px black",
			}}
		>
			{email.body}
		</Markdown>
	);
}

const PreviewEmail = ({
	value,
	info,
}: {
	value: EmailTemplate;
	info: ReturnType<typeof selectEmailInfo>;
}) => {
	const { members, session } = info;
	if (members.length === 0) return null;
	const member = members[0];

	const email = doSubstitution(value, member, session);
	return <FormatEmail email={email} />;
};

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
	const info = useAppSelector(selectEmailInfo);
	const [edited, setEdited] = React.useState<EmailTemplate | null>(null);
	const [saved, setSaved] = React.useState<EmailTemplate | null>(null);
	const [preview, setPreview] = React.useState(false);

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

	function onSend() {
		genEmails({ emailTemplate: edited!, info }).forEach((email) =>
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
						onClick={() => setPreview(!preview)}
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
				<>
					<Row>
							<Editor
								key={edited.id}
								subject={edited.subject}
								defaultBody={edited.body}
								onChangeSubject={(subject) => changeTemplate({ subject })}
								onChangeBody={(body) => changeTemplate({ body })}
								readOnly={preview}
							/>
					</Row>
				</>
			)}
		</Form>
	);
}

export default NotificationEmail;
