import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { Account, Dropdown } from 'dot11-components';

import LiveUpdateSwitch from './LiveUpdateSwitch';
import OnlineIndicator from './OnlineIndicator';

import './header.css';

import { useAppSelector } from '../store/hooks';
import { selectUser, selectUserAccessLevel, AccessLevel } from '../store/user';


const fullMenu = [
	{
		minAccess: AccessLevel.none,
		link: '/ballots',
		label: 'Ballots',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/voters',
		label: 'Ballot voters',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/results',
		label: 'Results',
	},
	{
		minAccess: AccessLevel.none,
		link: '/comments',
		label: 'Comments',
	},
	{
		minAccess: AccessLevel.none,
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
	const access = useAppSelector(selectUserAccessLevel);

	let classNames = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	const menu = fullMenu.filter(m => access >= m.minAccess);

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
			{isSmall?
				<Dropdown
					selectRenderer={({state, methods}) => <div className='nav-menu-icon' onClick={state.isOpen? methods.close: methods.open}/>}
					dropdownRenderer={(props) => <NavMenu className='nav-menu-vertical' {...props} />}
					dropdownAlign='left'
				/>:
				<div className='title'>802.11 CR</div>
			}
			<div className='nav-menu-container'>
				{isSmall?
					<label className='nav-link active'>{menuItem? menuItem.label: ''}</label>:
					<NavMenu className='nav-menu-horizontal' />
				}
			</div>
			<OnlineIndicator className='online-indicator' />
			<LiveUpdateSwitch className='live-update' />
			<Account user={user} />
		</header>
	)
}

export default Header;
