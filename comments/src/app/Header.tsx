import React from 'react';
import styled from '@emotion/styled';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { Account, Dropdown, Button } from 'dot11-components';

import LiveUpdateSwitch from './LiveUpdateSwitch';
import OnlineIndicator from './OnlineIndicator';
import PathWorkingGroupSelector from '../components/PathWorkingGroupSelector';

import './header.css';

import { resetStore } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUser, AccessLevel } from '../store/user';
import { selectCurrentBallotID } from '../store/ballots';
import { selectWorkingGroup, selectWorkingGroupPermissions } from '../store/groups';

const fullMenu = [
	{
		scope: 'ballots',
		minAccess: AccessLevel.ro,
		link: '/ballots',
		label: 'Ballots',
	},
	{
		scope: 'voters',
		minAccess: AccessLevel.ro,
		link: '/voters',
		label: 'Ballot voters',
	},
	{
		scope: 'results',
		minAccess: AccessLevel.ro,
		hasBallotID: true,
		link: '/results',
		label: 'Results',
	},
	{
		scope: 'comments',
		minAccess: AccessLevel.ro,
		hasBallotID: true,
		link: '/comments',
		label: 'Comments',
	},
	{
		scope: 'comments',
		minAccess: AccessLevel.ro,
		hasBallotID: true,
		link: '/reports',
		label: 'Reports',
	},
];

const NavItem = (props: React.ComponentProps<typeof NavLink> & {isActive?: boolean}) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({
	className,
	methods
}: {
	className?: string;
	methods?: {close: () => void};
}) {
	const BallotID = useAppSelector(selectCurrentBallotID);
	const workingGroup = useAppSelector(selectWorkingGroup);
	const permissions = useAppSelector(selectWorkingGroupPermissions);
	console.log(permissions)

	let classNames = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	if (!workingGroup)
		return null;

	const menu = fullMenu
		.filter(m => (permissions[m.scope] || AccessLevel.none) >= m.minAccess)
		.map(m => {
			let link = `/${workingGroup.name}/${m.link}`;
			if (m.hasBallotID)
				link += `/${BallotID}`;
			return <NavItem key={m.link} to={link}>{m.label}</NavItem>
		});

	return (
		<nav
			className={classNames}
			onClick={methods?.close}		// If a click bubbles up, close the dropdown
		>
			{menu}
		</nav>
	)
}

const Title = styled.div`
	font-family: "Arial", "Helvetica", sans-serif;
	font-weight: 400;
	font-size: 24px;
	color: #008080;
    border: unset;
    background-color: unset;
	padding: 0;
	margin: 5px;
	:hover {
		cursor: pointer;
	}
`;

const WorkingGroupSelector = Title.withComponent(PathWorkingGroupSelector);

function WorkingGroupTitle() {
	const navigate = useNavigate();
	const location = useLocation();
	const workingGroup = useAppSelector(selectWorkingGroup);

	const isRoot = /^\/[^/]*$/.test(location.pathname);
	const placeholder = workingGroup? "": "Select working group...";

	return isRoot?
		<WorkingGroupSelector
			placeholder={placeholder}
		/>:
		<Title
			onClick={() => navigate('/' + (workingGroup?.name || ''))}
		>
			{(workingGroup? workingGroup.name: '') + ' CR'}
		</Title>
}

const smallScreenQuery = window.matchMedia('(max-width: 992px');

function Header() {
	const dispatch = useAppDispatch();
	const user = useAppSelector(selectUser)!;
	const [isSmall, setIsSmall] = React.useState(smallScreenQuery.matches);

	React.useEffect(() => {
		const updateSmallScreen = (e: MediaQueryListEvent) => setIsSmall(e.matches);
		smallScreenQuery.addEventListener("change", updateSmallScreen);
		return () => smallScreenQuery.removeEventListener("change", updateSmallScreen);
	}, []);

	const location = useLocation();
	const menuItem = fullMenu.find(m => location.pathname.search(m.link) >= 0);
	
	return (
		
		<header className='header'>
			<WorkingGroupTitle />

			{isSmall &&
				<Dropdown
					selectRenderer={({state, methods}) => <div className='nav-menu-icon' onClick={state.isOpen? methods.close: methods.open}/>}
					dropdownRenderer={(props) => <NavMenu className='nav-menu-vertical' {...props} />}
					dropdownAlign='left'
				/>
			}
		
			<div className='nav-menu-container'>
				{isSmall?
					<label className='nav-link active'>{menuItem? menuItem.label: ''}</label>:
					<NavMenu className='nav-menu-horizontal' />
				}
			</div>

			<OnlineIndicator className='online-indicator' />

			<LiveUpdateSwitch className='live-update' />

			<Account user={user} >
				<Button
					onClick={() => dispatch(resetStore())}
				>
						Clear cache
				</Button>
			</Account>
		</header>
	)
}

export default Header;
