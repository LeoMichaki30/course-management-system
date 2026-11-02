import { useEffect, useState } from "react";
import { Icon } from "./components/Icon";
import { Dashboard } from "./pages/Dashboard";
import { EntityPage } from "./pages/EntityPage";
import { ViewsPage } from "./pages/ViewsPage";
import { pageLabels } from "./types";
import type { Page } from "./types";
import { useCatalog } from "./useCatalog";

const pages: Page[] = ["dashboard", "users", "courses", "modules", "contents", "views"];
function currentPage(): Page {
  const value = window.location.hash.replace(/^#\/?/, "");
  return pages.includes(value as Page) ? value as Page : "dashboard";
}
export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const state = useCatalog();
  useEffect(() => {
    const update = () => { setPage(currentPage()); setMenuOpen(false); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);
  useEffect(() => { document.title = `${pageLabels[page]} · Curso`; }, [page]);
  const hasErrors = Object.keys(state.errors).length > 0;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Ir para o conteúdo</a>
    {menuOpen && <button className="menu-scrim" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? "open" : ""}`} id="navigation"><a href="#/dashboard" className="brand" aria-label="Curso, visão geral"><span className="brand-icon"><Icon name="courses" size={23} /></span>curso<span className="brand-dot">.</span></a><p className="brand-caption">GESTÃO DO CONHECIMENTO</p><p className="nav-label">ESPAÇO DE TRABALHO</p><nav aria-label="Navegação principal">{pages.map(item => <a href={`#/${item}`} key={item} className={page === item ? "nav-item selected" : "nav-item"} aria-current={page === item ? "page" : undefined}><Icon name={item} /><span>{pageLabels[item]}</span>{page === item && <span className="nav-active-dot" />}</a>)}</nav><div className="sidebar-note"><span>✦</span><strong>Aprender transforma.</strong><p>Organizar é o primeiro passo.</p></div><div className="sidebar-footer"><span className="workspace-avatar">CM</span><div><strong>Course Management</strong><small>Espaço acadêmico</small></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button menu-toggle" aria-label="Abrir navegação" aria-expanded={menuOpen} aria-controls="navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button><span>Área de gestão</span><Icon name="chevron" size={13} /><strong>{pageLabels[page]}</strong></div><div className="topbar-actions"><span className={`connection ${hasErrors ? "limited" : ""}`}><i />{state.loading ? "Atualizando…" : hasErrors ? "Conexão limitada" : "Dados atualizados"}</span><button className={`icon-button ${state.loading ? "refreshing" : ""}`} disabled={state.loading} onClick={() => void state.refresh()} aria-label="Atualizar dados" title="Atualizar dados"><Icon name="refresh" size={18} /></button><span className="topbar-divider" /><span className="admin-avatar" title="Área administrativa">CM</span></div></header>
    <main id="main-content" tabIndex={-1}>{page === "dashboard" ? <Dashboard state={state} /> : page === "views" ? <ViewsPage state={state} /> : <EntityPage key={page} entity={page} state={state} />}</main><footer className="page-footer"><span>Course Management System</span><span>Feito para compartilhar conhecimento.</span></footer></div>
  </div>;
}
