import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";
import {dsnCN} from "../../hooks/helper";
import {HeadingTag, HeadingTitle} from "../../hooks/EremiaType";
import {CSSProperties} from "react";


interface ListItemProps {
    icon?: any,
    children?: any,
    number?: number,
    headingTag?: HeadingTag,
    headingTitle?: HeadingTitle,
    className?: string
}


export function ListItem({
                             icon,
                             children,
                             headingTag: Tag = "h4",
                             headingTitle = "title-block",
                             number,
                             className
                         }: ListItemProps) {
    return (
        <div className={dsnCN("item d-flex align-items-center", className)}>
            {icon && icon}
            {number && <span className={"number"}>{number}</span>}
            <Tag className={dsnCN(headingTitle, icon && "ml-15")}>
                {children}
            </Tag>
        </div>
    );
}

function List({className, iconSize, children, ...restProps}: { iconSize?: string | number } & DsnGridProps) {
    return (
        <DsnGrid className={dsnCN("dsn-list", className)} {...restProps} style={{"--dsn-icon-list": iconSize} as CSSProperties}>
            {children}
        </DsnGrid>
    );
}

List.item = ListItem;

export default List
