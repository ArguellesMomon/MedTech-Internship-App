export default function PageHeader({ children, description }) {
  return (
    <header className="tool-page-header">
      <h1 className="tool-page-title">{children}</h1>
      <p className="tool-page-description">{description}</p>
    </header>
  );
}
