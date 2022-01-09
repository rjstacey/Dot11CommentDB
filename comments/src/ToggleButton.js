import React from 'react';
import styled from '@emotion/styled';



function ToggleButton({className}) {
    const [toggle, setToggle] = React.useState(false);

    const triggerToggle = () => {
        console.log('toggle')
        setToggle( !toggle )
    }

    return(
        <div onClick={triggerToggle} className={className + (toggle? ' checked': '')}>
            <div className="wrg-toggle-container">
                <div className="wrg-toggle-check" style={{opacity: toggle? 1: 0}}>
                    <span>🌜</span>
                </div>
                <div className="wrg-toggle-uncheck" style={{opacity: toggle? 0: 1}}>
                    <span>🌞</span>
                </div>
            </div>
            <div className="wrg-toggle-circle" style={toggle? {left: 27}: undefined}></div>
            <input className="wrg-toggle-input" type="checkbox" aria-label="Toggle Button" />
        </div>
    )
}

export default styled(ToggleButton)`
      touch-action: pan-x;
      display: inline-block;
      position: relative;
      cursor: pointer;
      background-color: transparent;
      border: 0;
      padding: 0;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: rgba(0,0,0,0);
      -webkit-tap-highlight-color: transparent;

    .wrg-toggle-input {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
    }

    .wrg-toggle-check, .wrg-toggle-uncheck {
      position: absolute;
      width: 10px;
      height: 10px;
      top: 0;
      bottom: 0;
      margin-top: auto;
      margin-bottom: auto;
      line-height: 0;
      opacity: 0;
      transition: opacity .25s ease;
    }
    .wrg-toggle-check {
      left: 8px;
    }
    .wrg-toggle-uncheck {
      opacity: 1;
      right: 10px;
    }

    .wrg-toggle-uncheck span, 
    .wrg-toggle-check span {
      align-items: center;
      display: flex;
      height: 10px;
      justify-content: center;
      position: relative;
      width: 10px;
    }

    .wrg-toggle-container{
      width: 50px;
      height: 24px;
      padding: 0;
      border-radius: 30px;
      background-color: #4d4d4d;
      transition: all .2s ease;
    }

    .wrg-toggle-circle{
      transition: all .5s cubic-bezier(.23,1,.32,1) 0ms;
      position: absolute;
      top: 1px;
      left: 1px;
      width: 22px;
      height: 22px;
      border: 1px solid #4d4d4d;
      border-radius: 50%;
      background-color: #fafafa;
      box-sizing: border-box;
      transition: all .25s ease;
    }
`;