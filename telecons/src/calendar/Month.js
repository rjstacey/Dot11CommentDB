import React from 'react';
import styled from '@emotion/styled'

import {getMonthGrid, weekdayLabels} from './utils';

const Week = styled.div`
  display: flex;
  align-items: center;
`;

const DayOuter = styled.div`
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DayInner = styled.div`
  width: 1.5em;
  height: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
`;

function DayLabel({cell}) {

  const classNames = ['calendar_day'];
  if (cell.isWeekend)
    classNames.push('calendar_weekend')

  return (
    <DayOuter
      className={classNames.join(' ')}
    >
      <DayInner className='calendar_day_inner'>
        <span
          className={'calendar_weekday_label'}
        >
          {weekdayLabels[cell.date.getDay()]}
        </span>
      </DayInner>
    </DayOuter>
  );
}

function Day({cell, onClick}) {

  const classNames = ['calendar_date'];
  if (cell.isInactive)
    classNames.push('calendar_inactive')
  if (cell.isDisabled)
    classNames.push('calendar_disabled')
  if (cell.isWeekend)
    classNames.push('calendar_weekend')
  if (cell.isToday) 
    classNames.push('calendar_today')
  if (cell.isSelected)
    classNames.push('calendar_selected')

  return (
    <DayOuter 
      className={classNames.join(' ')}
      tabIndex={cell.isDisabled ? -1 : 0}
      onClick={cell.isDisabled? undefined: () => onClick(cell)}
    >
      <DayInner className='calendar_date_inner'>
        <span
          className='calendar_date_label'
        >
          {cell.date.getDate()}
        </span>
      </DayInner>
    </DayOuter>
  );
}

const MonthOuter = styled.div`
  padding: 5px;
`;

/* onKeyPress is called with an array of nodes representing the active dates in the month.
 * Navigate these nodes using arrow keys, etc. */
function onKeyPress(nodes, e) {
  if (nodes.length === 0)
    return;

  if (e.key === 'Escape') {
    //e.preventDefault();
    // hack so browser focuses the next tabbable element when
    // tab is pressed
    nodes[nodes.length-1].focus();
    nodes[nodes.length-1].blur();
  }

  let i = nodes.findIndex((cell) => cell === e.target);
  if (i < 0) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      nodes[0].focus();
    }
    return;
  }

  if (e.key === ' ' || e.key === 'Enter') {
    nodes[i].click();
    return;
  }

  if (e.key === 'ArrowDown') {
    i += 7;
    if (i >= nodes.length)
      i = nodes.length - 1;
  }
  else if (e.key === 'ArrowUp') {
    i -= 7;
    if (i < 0)
      i = 0;
  }
  else if (e.key === 'ArrowRight') {
    i++;
    if (i >= nodes.length)
      i = nodes.length - 1;
  }
  else if (e.key === 'ArrowLeft') {
    i--;
    if (i < 0)
      i = 0;
  }
  else if (e.key === 'Home') {
    i = 0;
  }
  else if (e.key === 'End') {
    i = nodes.length - 1;
  }
  else {
    return;
  }
  nodes[i].focus();
}

function Month({
  style,
  className,
  selectedDates,
  onDateClick,
  viewDate,
  options
}) {
  /* Use a callback ref instead of useEffect. The callback ref, by definition, is called
   * when the referenced node changes. useEffect doesn't necessarily trigger with ref changes. */
  const ref = React.useRef(null);
  const setRef = React.useCallback(node => {
    if (ref.current) {
      // Already set; do some cleanup
      const {node, listener} = ref.current;
      node.removeEventListener('keydown', listener);
    }
    
    if (node) {
      const nodes = Array.from(node.querySelectorAll('.calendar_date:not(.calendar_disabled)'));
      const listener = (e) => onKeyPress(nodes, e);
      node.addEventListener('keydown', listener);
      ref.current = {node, listener};
    }
    else {
      ref.current = null;
    }
  }, []);

  const matrix = React.useMemo(() => getMonthGrid({selectedDates, viewDate, options}), [selectedDates, viewDate, options]);

  return (
    <MonthOuter 
      style={style}
      className={(className? className + ' ': '') + 'calendar_month'}
    >
      <Week
        className="calendar_weekdays"
      >
        {matrix[0].map((cell) => 
          <DayLabel
            key={cell.date.getDay()}
            cell={cell}
          />
        )}
      </Week>
      <div
        ref={setRef}
        className="calendar_month_dates"
        role="grid"
      >
        {matrix.map((row, index) =>
          <Week
            key={index}
            className="calendar_week"
          >
            {row.map((cell) =>
              <Day
                key={cell.date.toString()}
                cell={cell}
                onClick={() => onDateClick(cell.date)}
              />
            )}
          </Week>
        )}
      </div>
    </MonthOuter>
  );
}

export default Month;
