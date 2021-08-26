import React from 'react';
import styled from '@emotion/styled'

import {getMonthGrid, isEqual, weekdayLabels} from './utils';

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

function WeekdayLabel({cell}) {

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
  if (cell.isWeekend)
    classNames.push('calendar_weekend')
  if (cell.isToday) 
    classNames.push('calendar_today')
  if (cell.isSelected)
    classNames.push('calendar_selected')

  return (
    <DayOuter 
      className={classNames.join(' ')}
      tabIndex={cell.isInactive ? -1 : 0}
      onClick={cell.isInactive? undefined: () => onClick(cell)}
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

function onKeyPress(cells, e) {
  if (cells.length === 0)
    return;

  if (e.key === 'Escape') {
    e.preventDefault();
    // hack so browser focuses the next tabbable element when
    // tab is pressed
    cells[cells.length-1].focus();
    cells[cells.length-1].blur();
  }

  let i = cells.findIndex((cell) => cell === e.target);
  if (i < 0) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      cells[0].focus();
    }
    return;
  }

  if (e.key === ' ' || e.key === 'Enter') {
    cells[i].click();
    return;
  }

  if (e.key === 'ArrowDown') {
    i += 7;
    if (i >= cells.length)
      i = cells.length - 1;
  }
  else if (e.key === 'ArrowUp') {
    i -= 7;
    if (i < 0)
      i = 0;
  }
  else if (e.key === 'ArrowRight') {
    i++;
    if (i >= cells.length)
      i = cells.length - 1;
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
    i = cells.length - 1;
  }
  else {
    return;
  }
  cells[i].focus();
}

function Month({
  style,
  className,
  selectedDates,
  setSelectedDates,
  viewDate,
}) {
  const datesRef = React.useRef();
  const matrix = getMonthGrid({selectedDates, viewDate});

  React.useEffect(() => {
    const currentRef = datesRef.current;
    if (!currentRef)
      return;
    const cells = Array.from(currentRef.querySelectorAll('.calendar_date:not(.calendar_inactive)'));
    const listener = (e) => onKeyPress(cells, e);
    currentRef.addEventListener('keydown', listener);
    return () => currentRef.removeEventListener('keydown', listener);
  }, [datesRef.current]);

  const onDateClicked = (cell) => {
    const clickedDate = cell.date;

    let newSelectedDates;
    const i = selectedDates.findIndex(d => isEqual(d, clickedDate));
    if (i >= 0) {
      newSelectedDates = selectedDates.slice();
      newSelectedDates.splice(i, 1);
    }
    else {
      newSelectedDates = selectedDates.concat(clickedDate);
    }

    setSelectedDates(newSelectedDates);
  };

  return (
    <MonthOuter 
      style={style}
      className={(className? className + ' ': '') + 'calendar_month'}
    >
      <Week
        className="calendar_weekdays"
      >
        {matrix[0].map((cell) => 
          <WeekdayLabel
            key={cell.date.getDay()}
            cell={cell}
          />
        )}
      </Week>
      <div
        ref={datesRef}
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
                onClick={() => onDateClicked(cell)}
              />
            )}
          </Week>
        )}
      </div>
    </MonthOuter>
  );
}

export default Month;
