import { useEffect, useState } from "react";
import { request, errorMessage } from "../api";
import { EntityForm } from "../components/EntityForm";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { formatDate, pageLabels, recordLabel, singularLabels } from "../types";
import type { Entity, EntityRecord } from "../types";
import type { CatalogState } from "../useCatalog";

const hints: Record<Entity, string> = {
  users: "As pessoas que fazem o conhecimento acontecer.", courses: "Organize a jornada de aprendizagem, do início ao próximo passo.",
  modules: "Estruture seus cursos em etapas de aprendizagem.", contents: "Reúna e organize o material de cada módulo."
};
export function EntityPage({ entity, state }: { entity: Entity; state: CatalogState }) {
  const { catalog, errors, loading, refresh } = state;
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ record?: EntityRecord } | null>(null);
  const [deleting, setDeleting] = useState<EntityRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search]);
  const records: EntityRecord[] = catalog[entity];
  const filtered = records.filter(record => Object.values(record).some(value => String(value ?? "").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const userName = (id: string) => catalog.users.find(user => user.id === id)?.name ?? `Usuário #${id}`;
  const courseName = (id: string) => catalog.courses.find(course => course.id === id)?.title ?? `Curso #${id}`;
  const moduleName = (id: string) => catalog.modules.find(module => module.id === id)?.title ?? `Módulo #${id}`;
  const dependencies: Entity[] = entity === "courses" ? ["users"] : entity === "modules" ? ["courses", "users"] : entity === "contents" ? ["modules"] : [];
  const canEdit = !loading && !errors[entity] && dependencies.every(key => !errors[key]);
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError("");
    try {
      await request(`/${entity}/${deleting.id}`, { method: "DELETE" });
      setDeleting(null); setSuccess("Registro excluído com sucesso."); void refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  const extraHeaders = entity === "users" ? ["E-mail", "Situação"] : entity === "courses" ? ["Código", "Responsável"] : entity === "modules" ? ["Curso", "Responsável"] : ["Módulo", "Material"];
  return <>
    <div className="page-heading"><div><p className="eyebrow">GESTÃO ACADÊMICA</p><h1>{pageLabels[entity]}</h1><p>{hints[entity]}</p></div><button className="button primary" disabled={!canEdit} onClick={() => { setSuccess(""); setForm({}); }}><Icon name="plus" /> Cadastrar {singularLabels[entity]}</button></div>
    {success && <div className="notice success" role="status"><Icon name="check" />{success}<button className="icon-button" aria-label="Dispensar mensagem" onClick={() => setSuccess("")}><Icon name="close" size={16} /></button></div>}
    {(errors[entity] || dependencies.some(key => errors[key])) && <div className="notice error" role="alert">{errors[entity] ?? "Não foi possível carregar as opções dos formulários. Atualize a página para tentar novamente."}<button className="text-button" onClick={() => void refresh()}>Tentar novamente</button></div>}
    <section className="panel">
      <div className="table-toolbar"><div className="section-title"><h2>Todos os {pageLabels[entity].toLowerCase()}</h2><span className="count">{errors[entity] ? "—" : records.length}</span></div><label className="search"><Icon name="search" size={18} /><input aria-label={`Buscar ${pageLabels[entity].toLowerCase()}`} placeholder={`Buscar ${pageLabels[entity].toLowerCase()}…`} value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {loading ? <div className="empty-state" role="status"><span className="spinner" />Carregando registros…</div> : errors[entity] ? <div className="empty-state">Os registros não estão disponíveis no momento.</div> : filtered.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name={entity} size={30} /></span><h3>{search ? "Nenhum resultado encontrado" : "Tudo começa com o primeiro cadastro"}</h3><p>{search ? "Tente buscar por outro termo." : `Cadastre um ${singularLabels[entity]} para começar.`}</p></div> : <div className="table-scroll"><table><thead><tr><th>{entity === "users" ? "Nome" : "Título"}</th>{extraHeaders.map(label => <th key={label}>{label}</th>)}<th>Cadastro</th><th className="align-right">Ações</th></tr></thead><tbody>{visible.map(record => <tr key={record.id}>
        <td><div className="record-name">{entity === "users" && <span className="avatar">{recordLabel(record).slice(0, 2).toUpperCase()}</span>}<div><strong>{recordLabel(record)}</strong><span className="record-id">#{record.id}</span></div></div></td>
        {"email" in record && <><td>{record.email}</td><td><span className={`badge ${record.status}`}><i />{record.status === "active" ? "Ativo" : "Inativo"}</span></td></>}
        {"code" in record && <><td><span className="code">{record.code}</span></td><td>{userName(record.user_id)}</td></>}
        {"course_id" in record && <><td>{courseName(record.course_id)}</td><td>{userName(record.user_id)}</td></>}
        {"module_id" in record && <><td>{moduleName(record.module_id)}</td><td><details className="material"><summary>Ver conteúdo</summary><pre>{record.content}</pre></details></td></>}
        <td className="date-cell">{formatDate(record.created_at)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Editar ${recordLabel(record)}`} title="Editar" disabled={!canEdit} onClick={() => setForm({ record })}><Icon name="edit" size={17} /></button><button className="icon-button danger-icon" aria-label={`Excluir ${recordLabel(record)}`} title="Excluir" disabled={!canEdit} onClick={() => { setError(""); setDeleting(record); }}><Icon name="delete" size={17} /></button></div></td>
      </tr>)}</tbody></table></div>}
      <div className="table-footer"><span>{loading ? "Carregando…" : `${filtered.length} registro${filtered.length === 1 ? "" : "s"}`}</span><div className="pagination"><button disabled={currentPage === 1 || loading} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior">‹</button><span>{currentPage} de {pageCount}</span><button disabled={currentPage >= pageCount || loading} onClick={() => setPage(currentPage + 1)} aria-label="Próxima página">›</button></div></div>
    </section>
    {form && <EntityForm entity={entity} record={form.record} catalog={catalog} onClose={() => setForm(null)} onSaved={() => { setForm(null); setSuccess("Registro salvo com sucesso."); void refresh(); }} />}
    {deleting && <Modal title={`Excluir ${singularLabels[entity]}?`} subtitle="Confira o registro antes de confirmar." busy={busy} onClose={() => setDeleting(null)}><div className="delete-body"><strong>{recordLabel(deleting)}</strong><p>Esta ação não pode ser desfeita.{entity === "contents" ? " As visualizações deste conteúdo também serão removidas." : " Registros com vínculos podem ter a exclusão bloqueada."}</p>{error && <div className="notice error" role="alert">{error}</div>}</div><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="button danger" disabled={busy} onClick={() => void remove()}>{busy ? "Excluindo…" : "Confirmar exclusão"}</button></div></Modal>}
  </>;
}
