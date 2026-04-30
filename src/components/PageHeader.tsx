import { Link } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  breadcrumb?: string;
  children?: React.ReactNode;
}

const PageHeader = ({ title, breadcrumb, children }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
      <div className="text-sm text-muted-foreground mt-1">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        {breadcrumb && <span className="text-primary"> / {breadcrumb}</span>}
      </div>
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

export default PageHeader;
