import { useCallback, useState } from "react";
import { ConfirmModal, shallowDiff, useDebounce } from "@common";

import { useAppDispatch } from "@/store/hooks";
import {
	updateEmailTemplate,
	deleteEmailTemplate,
	EmailTemplate,
} from "@/store/emailTemplates";

export function useEmailTemplateEdit(readOnly: boolean = false) {
	const dispatch = useAppDispatch();
	const [edited, setEdited] = useState<EmailTemplate | null>(null);
	const [saved, setSaved] = useState<EmailTemplate | null>(null);

	const debouncedSave = useDebounce(() => {
		if (!edited || !saved) return;
		const changes = shallowDiff(saved, edited);
		dispatch(updateEmailTemplate({ id: saved.id, changes }));
		setSaved(edited);
	});

	const setEmailTemplate = useCallback(
		(emailTemplate: EmailTemplate | null) => {
			debouncedSave.flush();
			setEdited(emailTemplate);
			setSaved(emailTemplate);
		},
		[debouncedSave, setEdited, setSaved],
	);

	const change = useCallback(
		(changes: Partial<EmailTemplate>) => {
			if (readOnly) return;
			setEdited((state) => ({ ...state!, ...changes }));
			debouncedSave();
		},
		[readOnly, debouncedSave, setEdited],
	);

	const doDelete = useCallback(async () => {
		if (!edited) return;
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${edited.name}?`,
		);
		if (ok) {
			debouncedSave.cancel(); // cancel, don't flush
			setEdited(null);
			setSaved(null);
			await dispatch(deleteEmailTemplate(edited.id));
		}
	}, [edited, debouncedSave, setEdited, setSaved, dispatch]);

	return {
		emailTemplate: edited,
		setEmailTemplate,
		changeEmailTemplate: change,
		deleteEmailTemplate: doDelete,
	};
}
