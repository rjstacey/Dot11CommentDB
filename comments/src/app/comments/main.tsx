import { panelKeys, type PanelKey, useCommentsLayout } from "@/hooks/commentsLayout";

import { CommentsListFilters, CommentsList } from "./list";
import { CommentsDetail } from "./details";
import { DraftDetail } from "./draft";
import { Panels, Panel } from "./panels";

import "./comments.css";

function getPanelContent(key: PanelKey) {
	if (key === "list") {
		return <CommentsList />;
	}
	else if (key === "detail") {
		return <CommentsDetail />;
	}
	else if (key === "draft") {
		return <DraftDetail />;
	}
}

export function CommentsMain() {
	const { visiblePanels, widths, setWidths } = useCommentsLayout();

	return (
		<>
			<CommentsListFilters />

			<Panels widths={widths} setWidths={setWidths} >
				{panelKeys.map((key) => (
					<Panel
						key={key}
						className={key === "detail" ? "details-panel" : undefined}
						isVisible={visiblePanels.includes(key)}
					>
						{getPanelContent(key)}
					</Panel>
				))}
			</Panels>
		</>
	);
}
