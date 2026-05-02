import {dsnCN} from "../../hooks/helper";

import {LinkProps} from "next/dist/client/link";
import DsnLink from "../../hooks/DsnLink";
import {transitionPage} from "../../hooks/EremiaType";


interface ButtonProps {
    className?: string,
    href: string,
    borderRadius?: boolean,
    linkProps?: Object | LinkProps,
    transitionPage?: transitionPage,
    borderStyle?: false |string | "border-color-default" | "border-color-theme-color" | "border-color-heading-color" | "border-color-body-color" | "border-color-main" | "border-color-assistant" | "border-color-gradient"
}


function Button({
                    // @ts-ignore
                    className, borderRadius, children, href, LinkProps,
                    transitionPage = false,
                    borderStyle = "border-color-heading-color",
                    ...restProps
                }: ButtonProps) {

    return (
        <DsnLink transitionPage={transitionPage} href={href} {...LinkProps} className={dsnCN("dsn-button", className , borderRadius && "border-rdu")} {...restProps}>
                {borderStyle && <span className={dsnCN("dsn-border", borderStyle, borderRadius && "dsn-border-rdu")}/>}
                {children}
        </DsnLink>
    );
}

export default Button;