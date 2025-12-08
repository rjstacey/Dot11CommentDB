import { Select, SelectRendererProps } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	addEmailTemplate,
	selectEmailTemplatesState,
	type EmailTemplateCreate,
	type EmailTemplate,
} from "@/store/emailTemplates";
import { SELECTED_MEMBERS_KEY } from "@/edit/emailSubstitutionTags";

export default function SelectEmailTemplate({
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

	async function createEmailTemplate({
		state,
	}: SelectRendererProps<EmailTemplate>) {
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
			id="select-email-template"
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
