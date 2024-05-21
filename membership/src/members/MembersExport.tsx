import {
	ButtonGroup,
	Button
} from "dot11-components";

import { useAppDispatch } from "../store/hooks";
import { exportMembersPrivate, exportMembersPublic, exportVotingMembers } from "../store/members";


function MembersExport() {
	const dispatch = useAppDispatch();

	return (
		<ButtonGroup className="button-group">
			<div>Export</div>
			<div style={{ display: "flex" }}>
				<Button
					style={{position: 'relative'}}
					title="Export public member list"
					onClick={() => dispatch(exportMembersPublic())}
				>
					<div style={{position: "relative", top: '-4px', height: 0, fontSize: 'x-small', fontWeight: 'bold'}}>
						public
					</div>
					<i className="bi-person-lines-fill" style={{position: 'relative', top: '4px', marginLeft: 'auto', marginRight: 'auto'}} />
				</Button>
				<Button
					title="Export private member list"
					onClick={() => dispatch(exportMembersPrivate())}
				>
					<div style={{position: "relative", top: '-4px', height: 0, fontSize: 'x-small', fontWeight: 'bold'}}>
						private
					</div>
					<i className="bi-person-lines-fill" style={{position: 'relative', top: '4px', marginLeft: 'auto', marginRight: 'auto'}} />
				</Button>
				<Button
					title="Export voring members list for session"
					onClick={() => dispatch(exportVotingMembers())}
				>
					<div style={{position: "relative", top: '-4px', height: 0, fontSize: 'x-small', fontWeight: 'bold'}}>
						session
					</div>
					<i className="bi-person-lines-fill" style={{position: 'relative', top: '4px', marginLeft: 'auto', marginRight: 'auto'}} />
				</Button>
			</div>
		</ButtonGroup>
	);
}

export default MembersExport;
