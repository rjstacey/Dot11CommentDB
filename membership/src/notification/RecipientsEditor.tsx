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

function selectItemRenderer({ item, methods }: SelectItemRendererProps) {
	const title = item.Name ? `${item.Name} <${item.Email}>` : item.Email;
	return (
		<div className={css.recipientItemSelected} title={title}>
			<span>{item.Name || item.Email}</span>
			<div
				className={css.close}
				onClick={() => methods.removeItem(item)}
			/>
		</div>
	);
}

function MemberEmailSelector({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
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
		/>
	);
}

function RecipientsEditor({
	email,
	onChange,
}: {
	email: EmailTemplate;
	onChange: (changes: Partial<EmailTemplate>) => void;
}) {
	return (
		<>
			<div className={css.recipientsContainer}>
				<label>To:</label>
				<span style={{ marginLeft: 5 }}>{email.to}</span>
			</div>
			<div className={css.recipientsContainer}>
				<label>Cc:</label>
				<MemberEmailSelector
					value={email.cc || ""}
					onChange={(cc) => onChange({ cc })}
				/>
			</div>
		</>
	);
}

export default RecipientsEditor;
