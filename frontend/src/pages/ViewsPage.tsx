import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { request, errorMessage } from "../api";
import { Icon } from "../components/Icon";
import { formatDate } from "../types";
import type { UserContentView } from "../types";
import type { CatalogState } from "../useCatalog";

export function ViewsPage({ state }: { state: CatalogState }) {
  const { catalog, loading, errors, refresh } = state;
  const [userId, setUserId] = useState("");
  const [contentId, setContentId] = useState("");
  const [watchedAt, setWatchedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"users" | "contents">("users");
  const [filterId, setFilterId] = useState("");
  const [views, setViews] = useState<UserContentView[] | null>(null);
  const [queryError, setQueryError] = useState("");
  const [querying, setQuerying] = useState(false);
  const query = useRef<AbortController | null>(null);
  useEffect(() => () => query.current?.abort(), []);
  function clearResults() { query.current?.abort(); setViews(null); setQueryError(""); setQuerying(false); }
  async function search(event: FormEvent) {
    event.preventDefault();
    if (!filterId) return;
    query.current?.abort();
    const controller = new AbortController(); query.current = controller;
    setQuerying(true); setQueryError(""); setViews(null);
    try {
      const result = await request<UserContentView[]>(`/content-views/${mode}/${filterId}`, { signal: controller.signal });
      if (!controller.signal.aborted) setViews(result);
    } catch (error) { if (!controller.signal.aborted) setQueryError(errorMessage(error)); }
    finally { if (!controller.signal.aborted) setQuerying(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaveError(""); setSuccess("");
    if (!userId || !contentId) { setSaveError("Selecione um usuário e um conteúdo."); return; }
    let timestamp: string | undefined;
    if (watchedAt) {
      const date = new Date(watchedAt);
      if (!Number.isFinite(date.getTime())) { setSaveError("Informe uma data e hora válidas."); return; }
      timestamp = date.toISOString();
    }
    setSaving(true);
    try {
      const record = await request<UserContentView>("/content-views", { method: "POST", body: { user_id: userId, content_id: contentId, ...(timestamp ? { watched_at: timestamp } : {}) } });
      setSuccess(`Visualização registrada em ${formatDate(record.watched_at)}.`);
      setUserId(""); setContentId(""); setWatchedAt(""); clearResults();
    } catch (error) { setSaveError(errorMessage(error)); }
    finally { setSaving(false); }
  }
  const options = mode === "users" ? catalog.users.map(user => ({ id: user.id, title: user.name })) : catalog.contents;
  const available = !loading && !errors.users && !errors.contents;
  return <>
    <div className="page-heading"><div><p className="eyebrow">APRENDIZAGEM EM FOCO</p><h1>Visualizações</h1><p>Acompanhe quem já descobriu cada conteúdo.</p></div><span className="soft-label"><Icon name="views" size={17} />Uma descoberta por conteúdo</span></div>
    {(errors.users || errors.contents) && <div className="notice error" role="alert">Não foi possível carregar usuários ou conteúdos.<button className="text-button" onClick={() => void refresh()}>Tentar novamente</button></div>}
    <div className="views-grid"><section className="panel view-register"><div className="panel-heading"><div><h2>Registrar visualização</h2><p>Conecte uma pessoa ao que ela aprendeu.</p></div><span className="stat-icon"><Icon name="plus" /></span></div><form onSubmit={event => void save(event)}><fieldset className="form-fields" disabled={saving || !available}>
      <label>Usuário <span className="required">*</span><select required name="user_id" value={userId} onChange={event => setUserId(event.target.value)}><option value="">Selecione um usuário…</option>{catalog.users.map(user => <option key={user.id} value={user.id}>{user.name} · #{user.id}</option>)}</select></label>
      <label>Conteúdo <span className="required">*</span><select required name="content_id" value={contentId} onChange={event => setContentId(event.target.value)}><option value="">Selecione um conteúdo…</option>{catalog.contents.map(content => <option key={content.id} value={content.id}>{content.title} · #{content.id}</option>)}</select></label>
      <label>Quando foi visualizado? <span className="optional">opcional</span><input type="datetime-local" name="watched_at" step="1" value={watchedAt} onChange={event => setWatchedAt(event.target.value)} /><small>Use seu horário local. Deixe em branco para registrar o momento atual.</small></label>
      <button className="button primary" disabled={saving || !available}><Icon name="check" size={18} />{saving ? "Registrando…" : "Registrar visualização"}</button>
    </fieldset>{saveError && <div className="notice error" role="alert">{saveError}</div>}{success && <div className="notice success" role="status">{success}</div>}</form><div className="view-note"><Icon name="views" /><p>A primeira visualização fica guardada. Se o mesmo usuário visualizar novamente, a data original será mantida.</p></div></section>
    <section className="panel view-query"><div className="panel-heading"><div><h2>Consultar visualizações</h2><p>Explore por pessoa ou por material.</p></div></div><form onSubmit={event => void search(event)}><div className="segmented" aria-label="Tipo de consulta"><button type="button" aria-pressed={mode === "users"} className={mode === "users" ? "selected" : ""} onClick={() => { setMode("users"); setFilterId(""); clearResults(); }}>Por usuário</button><button type="button" aria-pressed={mode === "contents"} className={mode === "contents" ? "selected" : ""} onClick={() => { setMode("contents"); setFilterId(""); clearResults(); }}>Por conteúdo</button></div><div className="query-fields"><label>{mode === "users" ? "Usuário" : "Conteúdo"}<select required disabled={!available} value={filterId} onChange={event => { setFilterId(event.target.value); clearResults(); }}><option value="">Selecione para consultar…</option>{options.map(option => <option key={option.id} value={option.id}>{option.title} · #{option.id}</option>)}</select></label><button className="button secondary" disabled={querying || !available || !filterId}><Icon name="search" size={17} />Consultar</button></div></form>
      {queryError && <div className="notice error" role="alert">{queryError}</div>}
      {querying ? <div className="empty-state" role="status"><span className="spinner" />Consultando visualizações…</div> : views === null ? <div className="empty-state view-placeholder"><span className="empty-icon"><Icon name="views" size={32} /></span><h3>Cada descoberta conta</h3><p>Selecione um usuário ou conteúdo<br />para explorar suas visualizações.</p></div> : views.length === 0 ? <div className="empty-state"><Icon name="views" size={30} /><h3>Nenhuma visualização registrada</h3><p>As primeiras descobertas aparecerão aqui.</p></div> : <><p className="result-count" role="status">{views.length} {views.length === 1 ? "visualização encontrada" : "visualizações encontradas"}</p><div className="table-scroll"><table><thead><tr><th>{mode === "users" ? "Conteúdo" : "Usuário"}</th><th>Primeira visualização</th></tr></thead><tbody>{views.map(view => <tr key={`${view.user_id}-${view.content_id}`}><td><strong>{mode === "users" ? catalog.contents.find(content => content.id === view.content_id)?.title ?? `Conteúdo #${view.content_id}` : catalog.users.find(user => user.id === view.user_id)?.name ?? `Usuário #${view.user_id}`}</strong></td><td className="date-cell">{formatDate(view.watched_at)}</td></tr>)}</tbody></table></div></>}
    </section></div>
  </>;
}
