import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import {Handle, IconCollapse} from 'dot11-common/lib/icons'
import {connect} from 'react-redux'

function getMembersSummary(members) {
	const s = {nv: 0, a: 0, pv: 0, v: 0, eo: 0}
	for (const m of Object.values(members)) {
		switch (m.Status) {
			case 'Non-Voter': s.nv++; break;
			case 'Aspirant': s.a++; break;
			case 'Potential Voter': s.pv++; break;
			case 'Voter': s.v++; break;
			case 'ExOfficio': s.eo++; break;
			default:
				console.warn('Unexpected member status: ', m.Status)
		}
	}
	return s;
}

const Container = styled.div`
	position: relative;
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 0 10px 10px 10px;
	box-sizing: border-box;
`;

const LV = styled.div`
	display: flex;
	justify-content: space-between;
`;

const LabelValue = ({label, children, ...otherProps}) =>
	<LV {...otherProps} >
		<span>{label}</span>
		{children}
	</LV>

function MembersSummary({
	className,
	style,
	members,
}) {
	const [showSummary, setShowSummary] = React.useState(true);
	const summary = getMembersSummary(members);

	return (
		<Container
			className={className}
			style={style}
		>
			<LabelValue label='Non-Voters:'>{summary.nv}</LabelValue>
			<LabelValue label='Aspirants:'>{summary.a}</LabelValue>
			<LabelValue label='Potential Voters:'>{summary.pv}</LabelValue>
			<LabelValue label='Voters:'>{summary.v}</LabelValue>
			<LabelValue label='ExOfficio:'>{summary.eo}</LabelValue>
			<IconCollapse isCollapsed={!showSummary} onClick={() => setShowSummary(!showSummary)} />
		</Container>
	)
}

MembersSummary.propTypes = {
	members: PropTypes.object.isRequired,
}

export default connect(
	(state) => ({members: state.members.entities})
)(MembersSummary);
