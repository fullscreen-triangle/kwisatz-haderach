import {dsnCN} from "../../hooks/helper";

function BgDot({className, rightPosition}: { className?: string, rightPosition?: boolean }) {
    return (
        <div className={dsnCN("bg-circle-dotted", rightPosition && "bg-circle-dotted-right", className)}
             style={{backgroundImage: "url(/img/circle-dotted.png)"}}/>
    );
}


export default BgDot;