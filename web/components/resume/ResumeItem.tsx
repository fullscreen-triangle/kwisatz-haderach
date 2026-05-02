import { dsnCN } from "../../hooks/helper";

function ResumeItem({ className, children, title, ...restProps }) {
  return (
    <div className={dsnCN("item-resume-box", className)} {...restProps}>
      {title && (
        <h3 className={dsnCN("sm-title-block", children && "mb-15")}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export default ResumeItem;
