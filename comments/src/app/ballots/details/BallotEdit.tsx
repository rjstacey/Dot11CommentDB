import type { BallotMultiple } from "@/hooks/ballotsEdit";
import type { BallotCreate, BallotChange } from "@/store/ballots";

import { BallotGroupRow } from "./BallotGroupRow";
import { BallotProjectRow } from "./BallotProjectRow";
import { BallotDatesRows } from "./BallotDatesRows";
import { BallotTypeRow } from "./BallotTypeRow";
import { BallotStageRow } from "./BallotStageRow";
import { BallotSeriesRow } from "./BallotSeriesRow";
import { BallotEpollRow } from "./BallotEpollRow";
import { BallotDocumentRow } from "./BallotDocumentRow";

export function BallotEdit({
	edited,
	saved,
	onChange,
	readOnly,
}: {
	edited: BallotCreate | BallotMultiple;
	saved?: BallotMultiple;
	onChange: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<BallotGroupRow
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<BallotProjectRow
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<BallotDocumentRow
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<BallotTypeRow
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<BallotStageRow
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<BallotSeriesRow
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<BallotDatesRows
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<BallotEpollRow
				edited={edited}
				saved={saved}
				onChange={onChange}
				readOnly={readOnly}
			/>
		</>
	);
}
