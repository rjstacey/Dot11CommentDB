import { Form, Row, Field, Input } from "dot11-components";
import { AffiliationMap } from "@/store/affiliationMap";

export type EditAction = "view" | "update" | "add";

function checkEntry(entry: AffiliationMap): string | undefined {
	if (!entry.match) return "Set match expression";
	if (!entry.shortAffiliation) return "Set short affiliation name";
}

export function AffiliationMapEntryForm({
	action,
	entry,
	change,
	busy,
	submit,
	cancel,
	readOnly,
}: {
	action: EditAction;
	entry: AffiliationMap;
	change: (changes: Partial<AffiliationMap>) => void;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	return (
		<Form
			className="main"
			busy={busy}
			submitLabel={action === "add" ? "Add" : "Update"}
			submit={submit}
			cancel={cancel}
			errorText={checkEntry(entry)}
		>
			<Row>
				<Field label="Match expression:">
					<Input
						type="search"
						value={entry.match}
						onChange={(e) => change({ match: e.target.value })}
						placeholder="(Blank)"
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Short affiliation name:">
					<Input
						type="text"
						value={entry.shortAffiliation}
						onChange={(e) =>
							change({ shortAffiliation: e.target.value })
						}
						placeholder="(Blank)"
						disabled={readOnly}
					/>
				</Field>
			</Row>
		</Form>
	);
}
