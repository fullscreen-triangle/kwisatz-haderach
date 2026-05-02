import  { DsnGridProps } from "../../layout/DsnGrid";
import { dsnCN } from "../../hooks/helper";
import ResumeItem from "./ResumeItem";

interface ResumeProps {
  title?: string;
}

function Resume({
  className,
  children,
  title
}: ResumeProps & DsnGridProps) {
  return (
    <div className={dsnCN("dsn-resume", className)}>
      <div className="resume-box-inner">
        <div className="resume-box">
          {title && <h3 className="title-block mb-30">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
}

Resume.item = ResumeItem;

export default Resume;
