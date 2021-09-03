import React from 'react';
import styled from '@emotion/styled'

import Header from './Header';
import Month from './Month';
import {isEqual} from './utils';

function Calendar({
  style,
  className,
  value,
  onChange,
  disablePast,
  multi,
  dual,
  minDate,
  maxDate
}) {
  const [viewDate, setViewDate] = React.useState(new Date());
  const selectedDates = value;

  const onPrevClick = () => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    setViewDate(newDate);
  }

  const onNextClick = () => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    setViewDate(newDate);
  }

  const onDateClick = (date) => {
    let newSelectedDates;
    if (multi) {
      const i = selectedDates.findIndex(d => isEqual(d, date));
      if (i >= 0) {
        newSelectedDates = selectedDates.slice();
        newSelectedDates.splice(i, 1);
      }
      else {
        newSelectedDates = selectedDates.concat(date);
      }
    }
    else {
      newSelectedDates = [date];
    }

    if (onChange)
      onChange(newSelectedDates);
  };

  const options = {disablePast, multi, dual, minDate, maxDate};

  return (
    <Container
      style={style}
      className={className}
    >
      <Header
        onClickPrev={onPrevClick}
        onClickNext={onNextClick}
        viewDate={viewDate}
        options={options}
      />
      <div style={{display: 'flex'}} >
        <Month
          selectedDates={value}
          onDateClick={onDateClick}
          viewDate={viewDate}
          options={options}
        />
        {dual &&
          <Month
            selectedDates={value}
            onDateClick={onDateClick}
            viewDate={new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1)}
            options={options}
          />}
      </div>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  box-sizing: border-box;
 
  cursor: default;

  button {
    border: none;
    margin: 0;
    padding: 0;
    width: auto;
    overflow: visible;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: normal;
    -webkit-font-smoothing: inherit;
    -moz-osx-font-smoothing: inherit;
    -webkit-appearance: none;
  }

  /* General Theme */
  --calendar-color-transparent: rgba(0, 0, 0, 0);
  --calendar-color-text-dark: #353535;
  --calendar-color-text-inactive: #c9c9ca;
  --calendar-color-text-light: #fff;
  --calendar-color-bg-light: #fff;
  --calendar-color-border: #f3f3f3;
  --calendar-color-text-hover: rgb(248, 249, 250);

  /* General Theme Main Colors Parts */
  --calendar-hsl-primary-hue: 208deg;
  --calendar-hsl-primary-saturation: 77%;
  --calendar-hsl-primary-light: 47%;
  --calendar-hsl-accent-hue: 0deg;
  --calendar-hsl-accent-saturation: 77%;
  --calendar-hsl-accent-light: 47%;

  /* General Theme Main Colors */
  --calendar-color-primary: hsl(var(--calendar-hsl-primary-hue) var(--calendar-hsl-primary-saturation) var(--calendar-hsl-primary-light));

  --calendar-color-primary-light: hsla(
    var(--calendar-hsl-primary-hue) var(--calendar-hsl-primary-saturation) var(--calendar-hsl-primary-light) / 40%
  );

  --calendar-color-primary-lighter: hsla(
    var(--calendar-hsl-primary-hue) var(--calendar-hsl-primary-saturation) var(--calendar-hsl-primary-light) / 8%
  );

  --calendar-color-accent: hsl(var(--calendar-hsl-accent-hue) var(--calendar-hsl-accent-saturation) var(--calendar-hsl-accent-light));

  --calendar-color-accent-light: hsla(
    var(--calendar-hsl-accent-hue) var(--calendar-hsl-accent-saturation) var(--calendar-hsl-accent-light) / 40%
  );

  --calendar-color-accent-lighter: hsla(
    var(--calendar-hsl-accent-hue) var(--calendar-hsl-accent-saturation) var(--calendar-hsl-accent-light) / 8%
  );

    /* Context Specific */
  --calendar-color-border-root: var(--calendar-color-border);
  --calendar-color-bg-text-hover-header-button: var(--calendar-color-text-hover);
  --calendar-color-text-today: var(--calendar-color-primary);
  --calendar-color-border-weekdays: var(--calendar-color-border);

  --calendar-color-text-column-labels: var(--calendar-color-text-inactive);
  --calendar-color-text-column-weekend-labels: var(--calendar-color-accent-light);

  --calendar-color-text-date-inactive: var(--calendar-color-text-inactive);
  --calendar-color-text-date-active: var(--calendar-color-text-dark);
  --calendar-color-text-date-weekend-active: var(--calendar-color-accent);
  --calendar-color-text-date-weekend-inactive: var(--calendar-color-accent-light);

  --calendar-color-bg-date-selected: var(--calendar-color-primary);
  --calendar-color-bg-date-weekend-selected: var(--calendar-color-accent);
  --calendar-color-text-date-selected: var(--calendar-color-text-light);
  --calendar-color-text-date-weekend-selected: var(--calendar-color-text-light);
  --calendar-color-text-date-disabled: var(--calendar-color-text-inactive);
  --calendar-color-text-date-weekend-disabled: var(--calendar-color-accent-light);

  --calendar-color-bg-disabled: var(--calendar-color-bg-light);
  --calendar-color-bg-disabled-cross: var(--calendar-color-text-inactive);
  --calendar-color-bg-disabled-weekend-cross: var(--calendar-color-accent-light);

  & {
    background-color: var(--calendar-color-bg-light);
    border: 1px solid var(--calendar-color-border);
    font-size: 1rem;
    border-radius: 8px;
  }

  & * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: var(--calendar-color-transparent);
    font-family: inherit;
  }
  
  .calendar_header span {
    font-size: 0.85em;
    color: var(--calendar-color-text-dark);
  }

  .calendar_header button:hover {
    opacity: 0.5;
  }

  .calendar_header button:active {
    transform: translateY(1px);
  }

  .calendar_day span {
    color: var(--calendar-color-text-column-labels);
    font-size: 0.83em;
    text-transform: uppercase;
  }

  .calendar_day.calendar_weekend span {
    color: var(--calendar-color-text-column-weekend-labels);
  }

  .calendar_date:not(.calendar_disabled) {
    cursor: pointer;
    border-radius: 2px;
  }

  .calendar_date  .calendar_date_inner {
    border-radius: 2px;
  }

  .calendar_date:not(.calendar_disabled):hover {
    opacity: 0.5;
  }

  .calendar_date span {
    font-size: 0.85em;
    color: var(--calendar-color-text-date-active);
  }

  /* Color for weekend dates */
  .calendar_date.calendar_weekend span {
    color: var(--calendar-color-text-date-weekend-active);
  }

  .calendar_date.calendar_disabled {
    opacity: 0.5;
  }

  /* Color for inactive dates */
  .calendar_date.calendar_inactive {
    opacity: 0.0;
  }
  .calendar_date.calendar_inactive.calendar_weekend span {
    color: var(--calendar-color-text-date-weekend-inactive);
  }

  /* Underline today's date (if not selected or disabled) */
  .calendar_date.calendar_today:not(.calendar_selected):not(.calendar_disabled) span {
    border-bottom: 1px solid currentColor;
  }

  /* Color and background when selected (both weekday and weekend) */
  .calendar_date.calendar_selected .calendar_date_inner {
    background-color: var(--calendar-color-bg-date-selected);
  }
  .calendar_date.calendar_selected span {
    color: var(--calendar-color-text-date-selected);
  }
  .calendar_date.calendar_selected.calendar_weekend .calendar_date_inner {
    background-color: var(--calendar-color-bg-date-weekend-selected);
  }
  .calendar_date.calendar_selected.calendar_weekend span {
    color: var(--calendar-color-text-date-weekend-selected);
  }
`;

export default Calendar;
