const translations: Record<string, string> = {
  "A user with this email already exists.": "Já existe um usuário com este e-mail.",
  "A course with this code already exists.": "Já existe um curso com este código.",
  "Cannot delete a user linked to courses or modules.": "Este usuário é responsável por cursos ou módulos. Remova esses vínculos antes de excluir.",
  "Cannot delete a course linked to modules.": "Este curso possui módulos. Exclua ou transfira os módulos antes de continuar.",
  "Cannot delete a module linked to contents.": "Este módulo possui conteúdos. Exclua ou transfira os conteúdos antes de continuar.",
  "The specified user does not exist.": "O usuário selecionado não existe mais. Atualize a lista.",
  "The specified course or user does not exist.": "O curso ou usuário selecionado não existe mais. Atualize a lista.",
  "The specified module does not exist.": "O módulo selecionado não existe mais. Atualize a lista.",
  "The specified user or content does not exist.": "O usuário ou conteúdo selecionado não existe mais. Atualize a lista.",
  "This user has already viewed this content.": "Esta visualização já foi registrada. A data original foi preservada.",
  "User not found.": "Usuário não encontrado.",
  "Course not found.": "Curso não encontrado.",
  "Module not found.": "Módulo não encontrado.",
  "Content not found.": "Conteúdo não encontrado.",
  "Request body is too large.": "O texto enviado excede o tamanho permitido pela API. Reduza o conteúdo."
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function translateError(status: number, message?: string): string {
  if (message && translations[message]) return translations[message];
  if (status === 400) return "Confira os campos informados. Há dados inválidos ou obrigatórios não preenchidos.";
  if (status === 404) return "O registro não foi encontrado. Atualize a lista.";
  if (status === 409) return "Não foi possível concluir por um conflito com os dados existentes.";
  if (status === 413) return "O conteúdo enviado é muito grande. Reduza o texto e tente novamente.";
  return "Não foi possível concluir a solicitação. Tente novamente em instantes.";
}

const apiUrl = (import.meta.env?.VITE_API_URL || "http://localhost:3001").replace(/\/+$/, "");

export async function request<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new ApiError(translateError(response.status, payload?.error), response.status);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(options.method && options.method !== "GET"
      ? "A conexão foi interrompida. Consulte a lista antes de repetir a operação para verificar se foi concluída."
      : "Não foi possível conectar à API. Verifique se o backend está em execução e tente novamente.", 0);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "Não foi possível concluir a operação. Tente novamente.";
