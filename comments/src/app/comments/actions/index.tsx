import { Button, ButtonGroup, Dropdown, DropdownButton, Spinner } from "react-bootstrap";

import CommentsImport from "./CommentsImport";
import CommentsExport from "./CommentsExport";
import CommentsCopy from "./CommentsCopy";

import { useAppSelector } from "@/store/hooks";
import {
	selectCommentsState,
	selectCommentsAccess,
	AccessLevel,
} from "@/store/comments";
import { selectIsOnline } from "@/store/offline";
import { useCommentsSearch, type Layout, layoutOptions } from "@/hooks/commentsSearch";

import ProjectBallotSelector from "@/components/ProjectBallotSelector";
import { CommentsListColumnSelector } from "../list";
import { refresh } from "../loader";

function LayoutIcon({ layout }: { layout: Layout }) {
	const items = layout.split("-");
	let padding = "2px 4px";
	if (items.length === 1) padding = "2px 12px";
	if (items.length === 2) padding = "2px 6px";
	return (
		<div style={{ display: "inline-flex", flexDirection: "row", flexWrap: "nowrap", border: "2px solid currentColor", borderRadius: 2 }}>
			{items.map((item, index) => {
				const icon = item === "list" ? "bi-layout-three-columns" : item === "detail" ? "bi-body-text" : "bi-file-pdf";
				const style: React.CSSProperties = {
					padding,
					borderLeft: index > 0 ? "2px solid currentColor" : undefined,
				}
				return <div key={item} style={style}><i className={icon} /></div>;
			})}
		</div>
	)
}

function LayoutItem({ layout, ...props }: { layout: Layout } & React.ComponentProps<typeof Dropdown.Item>) {
	return (
		<Dropdown.Item className="d-flex align-items-center justify-content-between gap-3" eventKey={layout} {...props}>
			{layout}
			<LayoutIcon layout={layout} />
		</Dropdown.Item>
	)
}

export function CommentsActions() {
	const isOnline = useAppSelector(selectIsOnline);
	const access = useAppSelector(selectCommentsAccess);
	const { loading } = useAppSelector(selectCommentsState);
	const { layout, setLayout } = useCommentsSearch();

	return (
		<div className="d-flex w-100 justify-content-between align-items-center">
			<ProjectBallotSelector />

			<div className="d-flex align-items-center gap-2">
				<CommentsListColumnSelector />

				<DropdownButton
					as={ButtonGroup}
					variant="outline-primary"
					title={<LayoutIcon key={layout} layout={layout} />}
					align="end"
					onSelect={setLayout}
				>
					{layoutOptions.map((o) => (<LayoutItem key={o} layout={o} active={layout === o} />))}
				</DropdownButton>
			</div>

			<div className="d-flex gap-2">
				<Spinner hidden={!loading} />

				{access >= AccessLevel.rw && (
					<>
						<CommentsImport disabled={!isOnline} />
						<CommentsExport disabled={!isOnline} />
					</>
				)}
				<CommentsCopy />
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					title="Refresh"
					disabled={!isOnline}
					onClick={refresh}
				/>
			</div>
		</div>
	);
}
