import React from 'react';
import styled from '@emotion/styled'

import {monthLabels} from './utils'

const HeaderContainer = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
`;

const ArrowButton = styled.button`
  position: absolute;
  height: 100%;
`;

const ArrowLeft = styled(ArrowButton)`
  left: 10px;
  :before {
    content: '←';
  }
`;

const ArrowRight = styled(ArrowButton)`
  right: 10px;
  :after {
    content: '→';
  }
`;

const Label = styled.div`
  display: flex;
  justify-content: center;
`;

function Header({
  onClickPrev,
  onClickNext,
  viewDate,
  options
}) {
  const date1 = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const months = [date1.getMonth()]
  const years = [date1.getFullYear()];
  if (options.dual) {
    const date2 = new Date(date1.getFullYear(), date1.getMonth() + 1, 1);
    months.push(date2.getMonth());
    if (date2.getFullYear() !== date1.getFullYear())
      years.push(date2.getFullYear());
  }
  return (
    <HeaderContainer className="calendar_header">
      <ArrowLeft
        className="calendar_arrow calendar_arrow-left"
        onClick={onClickPrev}
      />
      {years.map(year =>
        <Label
          key={year}
          style={{width: `${100/years.length}%`}}
        >
          {year}
        </Label>
      )}
      {months.map(month =>
        <Label
          key={month}
          style={{width: `${100/months.length}%`}}
        >
            {monthLabels[month]}
        </Label>
      )}
      <ArrowRight
        className="calendar_arrow calendar_arrow-right"
        onClick={onClickNext}
      />
    </HeaderContainer>
  );
}

export default Header;
