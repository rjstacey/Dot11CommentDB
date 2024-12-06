import React from "react";
import {
	Select,
	SelectItemRendererProps,
	SelectRendererProps,
} from "dot11-components";
import { useAppSelector } from "../store/hooks";
import { selectActiveMembers } from "../store/members";
import { EmailTemplate } from "../schemas/emailTemplates";

import css from "./notification.module.css";

type EntryOption = {
	Name: string | null;
	Email: string;
};

function itemRenderer({ item: member }: SelectItemRendererProps) {
	return <span>{member.Name || member.Email}</span>;
}

function selectItemRenderer({ item, props, methods }: SelectItemRendererProps) {
	const title = item.Name ? `${item.Name} <${item.Email}>` : item.Email;
	return (
		<div className={css.recipientItemSelected} title={title}>
			<span>{item.Name || item.Email}</span>
			{!props.readOnly && (
				<div
					className={css.close}
					onClick={() => methods.removeItem(item)}
				/>
			)}
		</div>
	);
}

function MemberEmailSelector({
	value,
	onChange,
	readOnly,
}: {
	value: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
}) {
	const members = useAppSelector(selectActiveMembers);
	const options: EntryOption[] = React.useMemo(
		() =>
			members.map(
				(m) =>
					({
						Name: m.Name,
						Email: m.Email.toLowerCase(),
					} satisfies EntryOption)
			),
		[members]
	);

	const values = value
		.split(";")
		.filter(Boolean)
		.map((s) => {
			let m = s.trim().match(/([A-Z0-9_\s]+)<(.*)>/i);
			if (m) return { Name: m[1], Email: m[2] };
			return { Name: null, Email: s.trim() };
		})
		.map((e) => {
			const entry = options.find(
				(o) => o.Email.toLowerCase() === e!.Email
			);
			return entry ? entry : e;
		});

	function handleChange(values: typeof options) {
		const value = values
			.map((m) => (m.Name ? `${m.Name} <${m.Email}>` : m.Email))
			.join("; ");
		console.log(value);
		onChange(value);
	}

	function createOption({ state }: SelectRendererProps) {
		let s = state.search;
		let m = s.trim().match(/([A-Z0-9_\s]+)<(.*)>/i);
		if (m) return { Name: m[1], Email: m[2] };
		return { Name: null, Email: s.trim() };
	}

	return (
		<Select
			className={css.recipientSelect}
			dropdownClassName={css.recipientSelectDropdown}
			values={values}
			options={options}
			onChange={handleChange}
			create
			multi
			createOption={createOption}
			handle={false}
			valueField="Email"
			labelField="Name"
			itemRenderer={itemRenderer}
			multiSelectItemRenderer={selectItemRenderer}
			readOnly={readOnly}
		/>
	);
}

function RecipientsEditor({
	email,
	onChange,
	readOnly,
}: {
	email: EmailTemplate;
	onChange: (changes: Partial<EmailTemplate>) => void;
	readOnly?: boolean;
}) {
	const [showCc, setShowCc] = React.useState(false);
	const [showBcc, setShowBcc] = React.useState(false);

	let ccLine: JSX.Element | undefined;
	if (showCc || email.cc) {
		ccLine = (
			<div className={css.recipientsContainer}>
				<label>Cc:</label>
				<MemberEmailSelector
					value={email.cc || ""}
					onChange={(cc) => onChange({ cc })}
					readOnly={readOnly}
				/>
			</div>
		);
	}

	let bccLine: JSX.Element | undefined;
	if (showBcc || email.bcc) {
		bccLine = (
			<div className={css.recipientsContainer}>
				<label>Bcc:</label>
				<MemberEmailSelector
					value={email.bcc || ""}
					onChange={(bcc) => onChange({ bcc })}
					readOnly={readOnly}
				/>
			</div>
		);
	}

	const toAddresses = email.to
		? email.to
				.split(";")
				.filter(Boolean)
				.map((s) => {
					let m = s.trim().match(/([A-Z0-9_\s]+)<(.*)>/i);
					if (m) return { Name: m[1], Email: m[2] };
					return { Name: null, Email: s.trim() };
				})
		: [];
	const toLine = (
		<div className={css.recipientsContainer}>
			<label>To:</label>
			{toAddresses.map((item) => {
				const title = item.Name
					? `${item.Name} <${item.Email}>`
					: item.Email;
				return (
					<div
						key={item.Email}
						className={css.recipientItemSelected}
						title={title}
					>
						<span>{item.Name || item.Email}</span>
					</div>
				);
			})}
		</div>
	);

	let ccButton: JSX.Element | undefined;
	let bccButton: JSX.Element | undefined;
	if (!readOnly && !ccLine) {
		ccButton = (
			<button onClick={() => setShowCc(true)} title="Add Cc recipients">
				Cc
			</button>
		);
	}
	if (!readOnly && !bccLine) {
		bccButton = (
			<button onClick={() => setShowBcc(true)} title="Add Bcc recipients">
				Bcc
			</button>
		);
	}

	return (
		<div
			className={css.recipients}
			onBlur={() => {
				setShowCc(false);
				setShowBcc(false);
			}}
		>
			<div className={css.rowWithExtra}>
				{toLine}
				<div className={css.recipientsExtra}>
					{ccButton}
					{bccButton}
				</div>
			</div>
			{ccLine}
			{bccLine}
		</div>
	);
}

export default RecipientsEditor;
