import { Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectUserMembersAccess, AccessLevel } from "@/store/members";

import ShowAccess from "@/components/ShowAccess";
import { useMembersEdit } from "@/hooks/membersEdit";
import { MemberAddForm } from "./MemberAddForm";
import { MemberUpdateOneForm } from "./MemberUpdateOneForm";
import { MemberUpdateManyForm } from "./MemberUpdateManyForm";

export function MemberDetail({
	selected,
	setSelected,
}: {
	selected: number[];
	setSelected: (ids: number[]) => void;
}) {
	const access = useAppSelector(selectUserMembersAccess);
	const readOnly = access <= AccessLevel.ro;

	const {
		state,
		onChange,
		hasChanges,
		submit,
		cancel,
		onAdd,
		onDelete,
		disableAdd,
		disableDelete,
	} = useMembersEdit({
		selected,
		setSelected,
		readOnly,
	});

	let title: string;
	let content: React.ReactNode;
	if (state.action === "add") {
		title = "Add member" + (state.originals.length > 1 ? "s" : "");
		content = (
			<MemberAddForm
				sapins={state.originals.map((m) => m.SAPIN)}
				edited={state.edited!}
				saved={state.saved!}
				onChange={onChange}
				hasChanges={hasChanges}
				submit={submit}
				cancel={cancel}
				readOnly={readOnly}
			/>
		);
	} else if (state.action === "update") {
		if (state.originals.length === 1) {
			title = "Update member";
			content = (
				<MemberUpdateOneForm
					sapins={state.originals.map((m) => m.SAPIN)}
					edited={state.edited!}
					saved={state.saved!}
					onChange={onChange}
					hasChanges={hasChanges}
					submit={submit}
					cancel={cancel}
					readOnly={readOnly}
				/>
			);
		} else {
			title = "Update members";
			content = (
				<MemberUpdateManyForm
					sapins={state.originals.map((m) => m.SAPIN)}
					edited={state.edited!}
					saved={state.saved!}
					onChange={onChange}
					hasChanges={hasChanges}
					submit={submit}
					cancel={cancel}
					readOnly={readOnly}
				/>
			);
		}
	} else {
		title = "Member detail";
		content = (
			<div className="placeholder">
				<span>{state.message}</span>
			</div>
		);
	}

	let actions: React.ReactNode = null;
	if (!readOnly) {
		actions = (
			<>
				<Button
					variant="outline-primary"
					className="bi-plus-lg"
					title="Add member"
					disabled={disableAdd}
					active={state.action === "add"}
					onClick={onAdd}
				>
					{" Add"}
				</Button>
				<Button
					variant="outline-danger"
					className="bi-trash"
					title="Delete member"
					disabled={disableDelete}
					onClick={onDelete}
				>
					{" Delete"}
				</Button>
			</>
		);
	}

	return (
		<>
			<div className="title-row">
				<h3>{title}</h3>
				<div>{actions}</div>
			</div>
			{content}
			<ShowAccess access={access} />
		</>
	);
}
