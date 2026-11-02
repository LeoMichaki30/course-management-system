import { useState } from "react";
import type { FormEvent } from "react";
import { buildPayload, initialValues, validateValues } from "../forms";
import { errorMessage, request } from "../api";
import type { Catalog, Entity, EntityRecord } from "../types";
import { singularLabels } from "../types";
import { Modal } from "./Modal";

export function EntityForm({ entity, record, catalog, onClose, onSaved }: { entity: Entity; record?: EntityRecord; catalog: Catalog; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState(() => initialValues(record));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (key: string, value: string) => setValues(current => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const validation = validateValues(entity, values);
    if (validation) { setError(validation); return; }
    setBusy(true); setError("");
    try {
      await request(`/${entity}${record ? `/${record.id}` : ""}`, { method: record ? "PUT" : "POST", body: buildPayload(entity, values) });
      onSaved();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  function text(key: string, label: string, type = "text") {
    return <label>{label} <span className="required">*</span><input name={key} type={type} required value={values[key] ?? ""} onChange={event => change(key, event.target.value)} /></label>;
  }
  function select(key: string, label: string, options: { id: string; label: string }[]) {
    return <label>{label} <span className="required">*</span><select name={key} required value={values[key] ?? ""} onChange={event => change(key, event.target.value)}><option value="">Selecione…</option>{options.map(option => <option key={option.id} value={option.id}>{option.label} · #{option.id}</option>)}</select>{options.length === 0 && <small>Nenhum registro disponível. Cadastre {label.toLowerCase()} primeiro.</small>}</label>;
  }
  return <Modal title={`${record ? "Editar" : "Cadastrar"} ${singularLabels[entity]}`} subtitle="Preencha as informações abaixo. Os campos com * são obrigatórios." busy={busy} onClose={onClose}>
    <form onSubmit={event => void submit(event)}>
      <fieldset disabled={busy} className="form-fields">
        {entity === "users" ? <>{text("name", "Nome completo")}{text("email", "E-mail", "email")}<label>Situação <span className="required">*</span><select name="status" value={values.status} onChange={event => change("status", event.target.value)}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label></> : <>
          {entity === "courses" && text("code", "Código do curso")}
          {text("title", "Título")}
          {entity === "modules" && select("course_id", "Curso", catalog.courses.map(item => ({ id: item.id, label: `${item.code} — ${item.title}` })))}
          {(entity === "courses" || entity === "modules") && select("user_id", "Usuário responsável", catalog.users.map(item => ({ id: item.id, label: item.name })))}
          {entity === "contents" && select("module_id", "Módulo", catalog.modules.map(item => ({ id: item.id, label: `${item.title} (${catalog.courses.find(course => course.id === item.course_id)?.title ?? `curso #${item.course_id}`})` })))}
          {entity === "contents" ? <label>Material didático <span className="required">*</span><textarea name="content" rows={10} required value={values.content} onChange={event => change("content", event.target.value)} /><small>Espaços e quebras de linha serão preservados.</small></label> : <label>Descrição <span className="optional">opcional</span><textarea name="description" rows={4} value={values.description ?? ""} onChange={event => change("description", event.target.value)} /></label>}
        </>}
      </fieldset>
      {error && <div role="alert" className="notice error">{error}</div>}
      <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Salvando…" : record ? "Salvar alterações" : "Cadastrar"}</button></div>
    </form>
  </Modal>;
}
