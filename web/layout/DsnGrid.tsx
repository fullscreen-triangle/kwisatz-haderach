import {dsnCN} from "../hooks/helper";
import {forwardRef, memo} from "react";

export interface DsnGridProps {
    col?: number | 1,
    className?: any,
    colTablet?: number | 1,
    colMobile?: number | 1,
    colGap?: number | string | 30,
    colGapTablet?: number | string | 30,
    colGapMobile?: number | string | 30,
    rowGap?: number | string | 30,
    rowGapTablet?: number | string | 30,
    rowGapMobile?: number | string | 30,
    customGrid?: { desktop?: string, tablet?: string, mobile?: string },
    as?: string,
    style?: object,
    children?: any,
}

// eslint-disable-next-line react/display-name
export const Dsn = forwardRef((props: DsnGridProps, ref) => {
    const {
        className,
        col,
        colTablet,
        colMobile,
        customGrid,
        colGap,
        colGapTablet,
        colGapMobile,
        rowGap,
        rowGapTablet,
        style,
        as: Tag = "div",
        rowGapMobile,
        children,
        ...restProps
    } = props;






    const gapPx = ($param) => {
        if (!isNaN($param))
            return $param + "px";
        return $param;
    }


    return (
        // @ts-ignore
        <Tag

            style={{
                ...style,
                '--dsn-col-custom': customGrid?.desktop,
                '--dsn-col-custom-tablet': customGrid?.tablet,
                '--dsn-col-custom-mobile': customGrid?.mobile,
                '--dsn-col-number': col,
                '--dsn-col-number-tablet': colTablet,
                '--dsn-col-number-mobile': colMobile,
                '--dsn-col-gap': gapPx(colGap),
                '--dsn-col-gap-tablet': gapPx(colGapTablet),
                '--dsn-col-gap-mobile': gapPx(colGapMobile),
                '--dsn-row-gap': gapPx(rowGap),
                '--dsn-row-gap-tablet': gapPx(rowGapTablet),
                '--dsn-row-gap-mobile': gapPx(rowGapMobile)

            }}
            className={dsnCN('dsn-grid-layout', customGrid && "dsn-grid-custom", className)}
            ref={ref} {...restProps}
        >
            {children}
        </Tag>
    );
});

Dsn.defaultProps = {}

function DsnGrid(props: DsnGridProps, ref) {
    return <Dsn {...props} ref={ref}/>
}

export default memo(forwardRef(DsnGrid));
