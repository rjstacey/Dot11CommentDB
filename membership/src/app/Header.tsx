import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';

import { Account, Dropdown, Button } from 'dot11-components';

import './header.css';

import { resetStore } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectWorkingGroup } from '../store/groups';
import { selectUser, selectUserMembersAccess, AccessLevel } from '../store/user';

import { PathWorkingGroupSelector } from './PathWorkingGroupSelector';

type MenuItem = {
	minAccess: number,
	link: string,
	label: string,
	prefixGroupName?: boolean,
}

const fullMenu: MenuItem[] = [
	{
		minAccess: AccessLevel.admin,
		link: '/',
		prefixGroupName: true,
		label: 'Members',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/organization',
		prefixGroupName: true,
		label: 'Organization',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/sessionParticipation',
		prefixGroupName: true,
		label: 'Session participation',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/ballotParticipation',
		prefixGroupName: true,
		label: 'Ballot participation',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/sessionAttendance',
		prefixGroupName: true,
		label: 'Session attendance',
	},
];

const NavItem = (props: React.ComponentProps<typeof NavLink> & {isActive?: boolean}) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({
	className,
	methods
}: {
	className?: string;
	methods?: {close: () => void};
}
) {
	const access = useAppSelector(selectUserMembersAccess);
	const groupName = useAppSelector(selectWorkingGroup)?.name;

	let classNames = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	const menu = fullMenu
		.filter(m => access >= m.minAccess)
		.map(m => m.prefixGroupName? {...m, link: `/${groupName || '*'}` + m.link}: m);

	return (
		<nav
			className={classNames}
			onClick={methods? methods.close: undefined}		// If a click bubbles up, close the dropdown
		>
			{menu.map(m => <NavItem key={m.link} to={m.link}>{m.label}</NavItem>)}
		</nav>
	)
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
			<PathWorkingGroupSelector />

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
			<Account user={user}>
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
