import React from 'react';
import MoveTrigger from "../../animation/MoveTrigger";
import {dsnCN} from "../../hooks/helper";


function TitleCover({className, children, from, to, ease, start, end, scrub, markers}) {
    return (
        <MoveTrigger from={from} to={to} markers={markers} scrub={scrub} end={end} start={start} ease={ease}>
            {(ref) => <div className={dsnCN('p-absolute title-cover', className)} ref={ref}>{children}</div>}
        </MoveTrigger>

    );
}

TitleCover.defaultProps = {
    from: {yPercent: -100, opacity: 0},
    to: {yPercent: 0, opacity: 0.12},
    end: "75%"
}


export default TitleCover;