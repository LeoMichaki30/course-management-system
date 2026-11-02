# Course Management System

Sistema de gerenciamento de cursos on-line desenvolvido como projeto acadêmico, com frontend em React, TypeScript e Vite, backend em Node.js, TypeScript e Express e banco de dados PostgreSQL por meio do Supabase.

O projeto está em desenvolvimento. Atualmente, a API disponibiliza os CRUDs de usuários, cursos, módulos e conteúdos. Também permite registrar a primeira visualização de cada conteúdo por usuário e consultar visualizações por usuário ou conteúdo.

## Objetivo

Construir uma API para organizar cursos e seus materiais, identificar os usuários responsáveis pela criação de cursos e módulos e registrar quais conteúdos foram assistidos por cada usuário. O projeto também aplica conceitos de modelagem relacional, integridade referencial e relatórios SQL.

## Tecnologias utilizadas

| Tecnologia | Utilização |
| --- | --- |
| React, Vite, HTML e CSS | Interface administrativa em português, responsiva e conectada à API |
| Node.js e npm | Execução do backend e gerenciamento de dependências |
| TypeScript | Tipagem estática com verificação estrita (`strict`) |
| Express 5 | Servidor HTTP, rotas e tratamento de requisições |
| Swagger UI / OpenAPI 3.0.3 | Documentação navegável dos contratos da API |
| Docker Compose / Nginx | Execução local dos dois serviços em containers e distribuição do frontend compilado |
| PostgreSQL / Supabase | Banco de dados relacional e acesso aos dados |
| `@supabase/supabase-js` | Cliente utilizado pelo backend para consultar o Supabase |
| `dotenv` | Carregamento das variáveis do arquivo `.env` |
| `tsx` | Execução dos arquivos TypeScript e modo de desenvolvimento |
| `node:test` e `node:assert/strict` | Testes automatizados das rotas de usuários, cursos, módulos e conteúdos |

## Arquitetura e estrutura de pastas

O backend utiliza uma arquitetura em camadas. As rotas encaminham as requisições aos controllers, que validam os dados e definem as respostas HTTP. Os repositories concentram as consultas ao banco, enquanto os models definem os tipos e contratos dos dados.

```text
course-management-system/
├── Dockerfile         # Backend compilado, execução com Node.js
├── .dockerignore
├── compose.yaml
├── frontend/          # React, Vite, Dockerfile e nginx.conf
├── src/
│   ├── config/
│   │   └── supabase.ts
│   ├── docs/
│   │   └── openapi.ts
│   ├── controllers/
│   │   ├── contentController.ts
│   │   ├── courseController.ts
│   │   ├── moduleController.ts
│   │   ├── userContentViewController.ts
│   │   └── userController.ts
│   ├── models/
│   │   ├── contentModel.ts
│   │   ├── courseModel.ts
│   │   ├── moduleModel.ts
│   │   ├── userContentViewModel.ts
│   │   └── userModel.ts
│   ├── repositories/
│   │   ├── contentRepository.ts
│   │   ├── courseRepository.ts
│   │   ├── moduleRepository.ts
│   │   ├── userContentViewRepository.ts
│   │   └── userRepository.ts
│   ├── routes/
│   │   ├── contentRoutes.ts
│   │   ├── courseRoutes.ts
│   │   ├── moduleRoutes.ts
│   │   ├── userContentViewRoutes.ts
│   │   └── userRoutes.ts
│   ├── app.ts
│   └── server.ts
├── supabase/
│   ├── migrations/
│   │   └── 20261030000000_create_course_management_schema.sql
│   └── seed.sql
├── sql/
│   └── reports.sql
├── tests/
│   ├── apiDocs.test.cjs
│   ├── contentRoutes.test.cjs
│   ├── courseRoutes.test.cjs
│   ├── moduleRoutes.test.cjs
│   ├── userContentViewRoutes.test.cjs
│   └── userRoutes.test.cjs
├── scripts/
│   ├── test-supabase.ts
│   └── tsconfig.json
├── .env.example
├── AGENTS.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.scripts.json
└── README.md
```

- `src/config/`: configuração do cliente Supabase compartilhado pelo backend.
- `src/controllers/`: validação de entrada, respostas HTTP e tratamento de erros.
- `src/models/`: tipos das entidades e dos dados de criação e atualização.
- `src/repositories/`: acesso ao banco de dados.
- `src/routes/`: definição dos endpoints.
- `src/app.ts`: configuração do Express, registro das rotas e tratamento global de erros.
- `src/server.ts`: inicialização do servidor na porta `3001`.
- `supabase/`: migration do esquema e dados de exemplo.
- `sql/`: consultas dos relatórios acadêmicos.
- `tests/` e `scripts/`: testes das rotas e verificação da conexão com o banco.

## Estrutura do banco de dados

O esquema PostgreSQL está definido em [supabase/migrations/20261030000000_create_course_management_schema.sql](supabase/migrations/20261030000000_create_course_management_schema.sql).

| Tabela | Campos | Finalidade |
| --- | --- | --- |
| `users` | `id`, `name`, `email`, `status`, `created_at`, `updated_at` | Cadastro de usuários |
| `courses` | `id`, `user_id`, `code`, `title`, `description`, `created_at`, `updated_at` | Cursos e identificação de seus criadores |
| `modules` | `id`, `course_id`, `user_id`, `title`, `description`, `created_at`, `updated_at` | Módulos vinculados a cursos e seus criadores |
| `contents` | `id`, `module_id`, `title`, `content`, `created_at`, `updated_at` | Conteúdos de cada módulo |
| `user_content_views` | `user_id`, `content_id`, `watched_at` | Associação entre usuários e conteúdos assistidos |

### Relacionamentos e regras

- Um usuário pode criar vários cursos e módulos. O criador de um módulo pode ser diferente do criador do curso.
- Um curso pode ter vários módulos, e um módulo pode ter vários conteúdos.
- Usuários e conteúdos possuem uma relação muitos-para-muitos por meio de `user_content_views`.
- As quatro entidades principais possuem chave primária `id` do tipo `BIGINT GENERATED BY DEFAULT AS IDENTITY`. As chaves estrangeiras também usam `BIGINT`.
- O e-mail do usuário é único, armazenado em letras minúsculas e sem espaços nas extremidades. O código do curso também é único.
- O campo `status` aceita `active` ou `inactive`, com padrão `active`.
- Nomes, títulos, códigos, e-mails e textos de conteúdo não podem ser vazios. As descrições são opcionais.
- As chaves estrangeiras impedem excluir usuários com cursos ou módulos, cursos com módulos e módulos com conteúdos (`ON DELETE RESTRICT`).
- A exclusão de um usuário ou conteúdo remove suas visualizações (`ON DELETE CASCADE`), desde que nenhuma outra restrição impeça a exclusão.
- A combinação `user_id` e `content_id` é única em `user_content_views`. O objetivo é registrar a primeira visualização; uma nova inserção do mesmo par é rejeitada. O endpoint de registro retorna `409` em tentativas repetidas, preservando o timestamp original.
- Os timestamps usam `TIMESTAMPTZ`. `created_at`, `updated_at` e `watched_at` recebem a data de inserção por padrão. Triggers atualizam `updated_at` a cada alteração. É possível informar explicitamente `watched_at`.
- Há índices nas chaves estrangeiras; a restrição de unicidade das visualizações já indexa o par começando por `user_id`.

A migration habilita Row Level Security (RLS) nas cinco tabelas, sem políticas públicas, revoga o acesso dos papéis públicos e concede operações ao `service_role`. O acesso é realizado pelo backend com uma chave privada que contorna a RLS. Essa configuração não implementa autenticação ou autorização dos usuários da API.

Como o `BIGINT` pode ultrapassar a precisão segura do JavaScript, os CRUDs de usuários, cursos, módulos e conteúdos convertem os IDs para texto nas consultas e os retornam como strings no JSON. Em cursos, isso também se aplica ao campo `user_id`; em módulos, aos campos `course_id` e `user_id`; em conteúdos, ao campo `module_id`.

### Dados de exemplo e relatórios

O arquivo [supabase/seed.sql](supabase/seed.sql) insere 5 usuários, 3 cursos, 10 módulos, 14 conteúdos e 7 visualizações. Ele utiliza IDs explícitos para tornar os resultados reproduzíveis e ajusta as sequências após a inserção.

| Curso de exemplo | Módulos | Conteúdos |
| --- | --- | --- |
| Web Development | 5 | 5 |
| Database Fundamentals | 3 | 5 |
| Software Engineering | 2 | 4 |

O arquivo [sql/reports.sql](sql/reports.sql) contém cinco consultas:

1. Usuários ordenados pela quantidade de cursos criados, incluindo quem não criou cursos.
2. Cursos com a maior quantidade de conteúdos, incluindo empates.
3. Todos os cursos com suas quantidades de módulos e conteúdos.
4. Conteúdos acompanhados do título do curso correspondente.
5. Usuários que assistiram ao conteúdo de ID `2`, com a data da visualização.

Com o seed, Alice possui dois cursos e Benjamin possui um; os demais usuários possuem zero. Os cursos 1 e 2 empatam com cinco conteúdos. O relatório de contagens retorna `(1, 5, 5)`, `(2, 3, 5)` e `(3, 2, 4)` para curso, módulos e conteúdos. O relatório de conteúdos retorna 14 registros, e Alice, Benjamin e Chloe aparecem entre os usuários que assistiram ao conteúdo `2`.

## Instalação e execução

### Pré-requisitos

- Node.js 22.12 ou superior (ou Node.js 24) e npm para executar também o frontend Vite.
- Git.
- Um projeto Supabase de desenvolvimento com o esquema configurado conforme as instruções abaixo.

### 1. Clonar e instalar

```sh
git clone https://github.com/LeoMichaki30/course-management-system.git
cd course-management-system
npm ci
```

### 2. Configurar o arquivo `.env`

Copie o modelo para a raiz do projeto:

```sh
cp .env.example .env
```

No PowerShell, o comando equivalente é `Copy-Item .env.example .env`.

Preencha o arquivo com os dados do seu projeto Supabase. Os valores abaixo são apenas exemplos fictícios:

```dotenv
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SECRET_KEY=sua_chave_secreta_do_servidor
```

- `SUPABASE_URL`: URL do projeto Supabase, com protocolo HTTP ou HTTPS.
- `SUPABASE_SECRET_KEY`: chave secreta destinada ao servidor. A configuração também aceita a chave legada `service_role` nessa variável.

Nunca publique o `.env`, faça commit de credenciais ou exponha a chave em código de frontend. O cliente em `src/config/supabase.ts` carrega essas variáveis e desabilita persistência e renovação de sessões. A API exige as duas variáveis ao iniciar, inclusive para acessar a rota `/`, pois as rotas de usuários importam esse cliente.

### 3. Preparar o banco de desenvolvimento

Para um projeto Supabase de desenvolvimento novo e vazio:

1. Abra o SQL Editor no painel do Supabase.
2. Execute uma única vez o conteúdo de `supabase/migrations/20261030000000_create_course_management_schema.sql`.
3. Execute uma única vez o conteúdo de `supabase/seed.sql` para inserir os dados de exemplo.
4. Execute as consultas de `sql/reports.sql` para conferir os resultados.

Se estiver continuando o projeto em outro computador e o banco remoto já estiver configurado, reutilize esse projeto e configure o `.env` local. Não reaplique a migration nem o seed.

O seed é destinado a um banco de desenvolvimento vazio, não a produção ou a uma base com dados existentes. Os scripts não incluem reset nem substituição dos registros; repeti-los pode gerar erros por objetos ou valores já existentes.

Esse procedimento usa o SQL Editor e dispensa uma instalação local do Supabase com Docker. A migration pressupõe os papéis nativos `anon`, `authenticated` e `service_role`. A execução manual não registra automaticamente a migration no histórico da Supabase CLI; antes de adotar esse fluxo, será necessário reconciliar o histórico para evitar reaplicá-la.

### 4. Iniciar a API

Para desenvolvimento, com reinicialização automática ao alterar arquivos:

```sh
npm run dev
```

Para executar sem o modo de observação:

```sh
npm start
```

Ambos executam o código TypeScript com `tsx`. A API fica disponível em `http://localhost:3001`.

Acesse `GET http://localhost:3001/` para conferir a resposta inicial:

```json
{
  "message": "Course Management System API",
  "version": "1.0.0"
}
```

Essa rota verifica a disponibilidade do Express; ela não consulta o banco de dados.

## Frontend React

A interface em `frontend/` é independente do backend. Inclui dashboard com contagens e estrutura dos cursos, CRUD de usuários, cursos, módulos e conteúdos, seleção dos vínculos e registro/consulta de visualizações. A navegação usa URLs com hash, como `/#/courses`, sem exigir configuração de rotas no servidor de arquivos estáticos.

Os formulários usam os métodos POST/PUT existentes, mantêm IDs BIGINT como strings, preservam o texto original dos conteúdos e traduzem erros para português. As listas incluem busca e paginação local. A exclusão exige confirmação e informa os conflitos de vínculos ou a remoção em cascata das visualizações. Há estados de carregamento, falha, lista vazia e sucesso. O menu lateral se adapta às telas pequenas e as tabelas têm rolagem horizontal própria.

### Executar com a API real

Na raiz, com o `.env` do backend já configurado:

```sh
npm ci
npm run dev
```

Em outro terminal, também a partir da raiz:

```sh
npm --prefix frontend ci
cp frontend/.env.example frontend/.env
npm --prefix frontend run dev
```

No PowerShell, use `Copy-Item frontend/.env.example frontend/.env` para a cópia. O frontend abre em **http://localhost:5173** e consome **http://localhost:3001** por padrão. As portas são fixas: se estiverem ocupadas, encerre o processo correspondente ou escolha uma configuração compatível antes de iniciar.

O arquivo `frontend/.env` é opcional e aceita somente a URL pública da API:

```dotenv
VITE_API_URL=http://localhost:3001
```

Reinicie o Vite após alterar essa configuração. No build, a URL é incorporada ao código gerado. Não copie o `.env` da raiz para o frontend: **nenhuma chave do Supabase deve usar o prefixo `VITE_` ou ser colocada no código do navegador**. A interface acessa apenas o Express. As variáveis com prefixo `VITE_` são públicas, conforme a [documentação do Vite](https://vite.dev/guide/env-and-mode).

Ao usar o backend real, salvar ou excluir pela interface altera o banco configurado nele. Os testes descritos abaixo utilizam somente dados simulados.

O middleware `src/middleware/localCors.ts` permite somente as origens locais `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173` e `http://127.0.0.1:4173`. Não usa origem curinga nem credenciais de sessão. As portas 5173 e 4173 correspondem ao desenvolvimento e ao preview local. CORS não substitui autenticação; esta permanece fora do escopo implementado.

### Build, typecheck e testes do frontend

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm --prefix frontend test
npm --prefix frontend run preview
```

O build é gerado em `frontend/dist/` e o preview abre em **http://localhost:4173**. O servidor de preview serve o build; o backend precisa continuar em execução. Os arquivos gerados e `node_modules` estão ignorados pelo Git.

Os testes do frontend verificam payloads, tradução de erros, resposta `204`, ausência de repetição automática de escritas e preservação dos IDs e do material formatado. Eles não fazem requisições reais. A implementação usa apenas React/React DOM em execução, sem bibliotecas adicionais de componentes ou roteamento; Vite, TypeScript e suas ferramentas são dependências de desenvolvimento.

### Revisar a interface sem Supabase

Há uma API descartável em memória em `frontend/tests/mock-api.ts`. Ela não importa o Supabase, não usa credenciais e não grava arquivos. Para usá-la, instale as dependências do frontend e execute em um terminal:

```sh
cd frontend
node --import tsx tests/mock-api.ts
```

Em outro terminal, na raiz do projeto:

```sh
VITE_API_URL=http://127.0.0.1:3009 npm --prefix frontend run dev
```

No PowerShell, defina primeiro `$env:VITE_API_URL="http://127.0.0.1:3009"` e execute `npm --prefix frontend run dev`. Abra http://localhost:5173. Os cadastros e exclusões ficam apenas na memória do processo da API de teste. Encerre ambos com `Ctrl+C`; os dados fictícios são descartados. Remova a variável do terminal antes de retornar à API real (`Remove-Item Env:VITE_API_URL` no PowerShell).

A API de teste permite revisar a interface, mas não reproduz todas as constraints ou cascatas do PostgreSQL e não substitui os testes do backend nem a integração real autorizada.

## Executar com Docker Compose

A configuração inicia **somente backend e frontend**. O banco continua sendo o projeto remoto do Supabase já configurado. Não há serviço PostgreSQL local, execução de migrations, seed ou reset na inicialização.

### Pré-requisitos

- Docker Engine ou Docker Desktop em execução, com Docker Compose v2 e suporte a containers Linux.
- Portas locais `3001` e `4173` disponíveis. Encerre servidores locais que estejam usando essas portas antes de iniciar os containers.
- `.env` na raiz com `SUPABASE_URL` e `SUPABASE_SECRET_KEY` do projeto remoto existente. Não substitua esse arquivo se ele já estiver configurado.

O Compose lê as variáveis do `.env` da raiz e injeta somente as configurações necessárias no backend em tempo de execução. Variáveis exportadas no terminal têm precedência. A configuração falha com uma mensagem caso uma variável obrigatória esteja vazia. Não é necessário criar `frontend/.env` para usar Docker.

### Iniciar, acompanhar e parar

Na raiz do projeto:

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

A primeira execução baixa as imagens base e instala as dependências. Acesse:

| Serviço | Endereço |
| --- | --- |
| Frontend | http://localhost:4173 |
| Backend | http://localhost:3001 |
| Swagger UI | http://localhost:3001/api-docs |
| OpenAPI JSON | http://localhost:3001/api-docs.json |

Para acompanhar os logs e encerrar os serviços:

```sh
docker compose logs -f backend frontend
docker compose down
```

Use `Ctrl+C` para sair dos logs. `docker compose down` remove os containers e a rede local; não apaga dados do Supabase remoto. As imagens permanecem disponíveis para uma próxima inicialização. Alterações no código exigem reconstrução com `docker compose up --build -d`; esse fluxo serve versões compiladas, sem recarregamento automático.

### Comunicação entre frontend e backend

O frontend é compilado pelo Vite e servido pelo Nginx na porta `4173` do computador. A URL pública padrão da API é **http://localhost:3001**, incorporada ao build por `VITE_API_URL`. O navegador acessa essa porta publicada do backend; ele não resolve o nome interno `backend` da rede Docker. Não configure `http://backend:3001` como URL do navegador.

O CORS existente já permite `http://localhost:4173` e `http://127.0.0.1:4173`, portanto não foi ampliado. As portas são publicadas apenas em `127.0.0.1`, para uso local. Não é necessário um proxy ou mudança nos endpoints. O Swagger continua sendo servido diretamente pelo Express na porta `3001` e usa a própria origem para acessar `/api-docs.json` e a API.

Se precisar mudar a URL pública, defina `VITE_API_URL` no ambiente do Compose e reconstrua o frontend. Essa configuração é pública e de build, não uma variável dinâmica do Nginx. A origem do frontend e as regras de CORS precisam continuar compatíveis. Para o fluxo local padrão, nenhuma alteração é necessária.

### Imagens e credenciais

- O `Dockerfile` da raiz compila TypeScript em uma etapa e instala apenas dependências de produção na imagem final. O processo usa o usuário `node` e executa `node dist/server.js`, sem `tsx` ou modo watch.
- `frontend/Dockerfile` usa o contexto da raiz para acessar os tipos compartilhados de `src/models`. A imagem final contém apenas Nginx, sua configuração e os arquivos estáticos compilados.
- `.dockerignore` e `frontend/Dockerfile.dockerignore` restringem os contextos a arquivos explicitamente permitidos. Excluem `.env`, variantes, `.npmrc`, chaves, certificados, Git, dependências locais e builds anteriores. O arquivo específico do Dockerfile do frontend tem precedência sobre o `.dockerignore` da raiz, conforme a [referência do Docker](https://docs.docker.com/build/building/context/#dockerignore-files).
- Não há credenciais em `ARG`, `ENV` dos Dockerfiles, código do frontend ou arquivos copiados para as imagens. A chave do Supabase existe apenas na configuração local e no ambiente do backend em execução. Nunca a use como `VITE_API_URL` ou outra variável `VITE_`.
- O comando `docker compose config --quiet` valida a configuração sem imprimi-la. Evite compartilhar a saída completa de `docker compose config` ou de inspeções dos containers, pois elas podem incluir o ambiente de execução.

O frontend aguarda o healthcheck do backend. Esse healthcheck acessa apenas `GET /`, que não consulta o Supabase; ele confirma a disponibilidade HTTP, não a conectividade ou integridade do banco remoto. O healthcheck do frontend verifica a página estática.

### Verificação dos containers sem escrita no banco

Depois de iniciá-los:

```sh
curl -f http://localhost:4173/
curl -f http://localhost:3001/
curl -f http://localhost:3001/api-docs/
curl -f http://localhost:3001/api-docs.json
curl -i -X OPTIONS http://localhost:3001/users -H "Origin: http://localhost:4173" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type"
```

Essas verificações não escrevem nem consultam tabelas no Supabase. O último comando verifica o preflight CORS da origem do frontend. Salvar/excluir registros na interface ou executar operações pelo Swagger envia requisições reais ao banco remoto e deve ser feito somente quando autorizado.

## Documentação da API — Swagger/OpenAPI

A documentação usa Swagger UI e a especificação OpenAPI 3.0.3, definida em `src/docs/openapi.ts`. Ela descreve a rota inicial, os CRUDs de usuários, cursos, módulos e conteúdos e os três endpoints de visualizações, com parâmetros, schemas, exemplos de requisições/respostas e códigos HTTP conforme cada operação. Os nomes técnicos e as descrições da especificação estão em inglês.

Depois de instalar as dependências e configurar o `.env` do backend, execute na raiz:

```sh
npm ci
npm run dev
```

Acesse:

- **Swagger UI:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs).
- **Especificação JSON:** [http://localhost:3001/api-docs.json](http://localhost:3001/api-docs.json).

O Express serve a interface e seus arquivos localmente, usando `swagger-ui-express`; os tipos TypeScript ficam nas dependências de desenvolvimento. O validador remoto do Swagger UI está desabilitado. O servidor selecionado na documentação é a própria origem do Express, sem credenciais embutidas.

**O botão “Try it out” envia requisições reais.** Executar POST, PUT ou DELETE pela documentação pode alterar o banco configurado no backend. Os exemplos são ilustrativos: seus registros referenciados precisam existir para operações reais. Nenhum exemplo é inserido automaticamente. Os testes de documentação somente acessam a interface, os arquivos estáticos, a especificação e a rota inicial, sem consultar ou escrever no Supabase.

A documentação mantém IDs BIGINT como strings, distingue campos opcionais no POST dos obrigatórios no PUT, informa a preservação do material formatado e descreve os bloqueios de exclusão e as cascatas. Não adiciona autenticação, validação de requisições por OpenAPI ou novos comportamentos aos endpoints. Alterações futuras nos contratos precisam ser refletidas em `src/docs/openapi.ts`.

## Endpoints implementados

URL base local: `http://localhost:3001`.

| Método | Endpoint | Resposta de sucesso | Descrição |
| --- | --- | --- | --- |
| GET | `/` | `200` | Identificação e versão da API |
| GET | `/users` | `200` | Lista usuários ordenados por ID; retorna `[]` se não houver registros |
| GET | `/users/:id` | `200` | Busca um usuário pelo ID |
| POST | `/users` | `201` | Cria um usuário e retorna o cabeçalho `Location` |
| PUT | `/users/:id` | `200` | Substitui todos os campos editáveis de um usuário |
| DELETE | `/users/:id` | `204` | Exclui um usuário, sem corpo na resposta |
| GET | `/courses` | `200` | Lista cursos ordenados por ID; retorna `[]` se não houver registros |
| GET | `/courses/:id` | `200` | Busca um curso pelo ID |
| POST | `/courses` | `201` | Cria um curso e retorna o cabeçalho `Location` |
| PUT | `/courses/:id` | `200` | Substitui todos os campos editáveis de um curso |
| DELETE | `/courses/:id` | `204` | Exclui um curso sem módulos, sem corpo na resposta |
| GET | `/modules` | `200` | Lista módulos ordenados por ID; retorna `[]` se não houver registros |
| GET | `/modules/:id` | `200` | Busca um módulo pelo ID |
| POST | `/modules` | `201` | Cria um módulo e retorna o cabeçalho `Location` |
| PUT | `/modules/:id` | `200` | Substitui todos os campos editáveis de um módulo |
| DELETE | `/modules/:id` | `204` | Exclui um módulo sem conteúdos, sem corpo na resposta |
| GET | `/contents` | `200` | Lista conteúdos ordenados por ID; retorna `[]` se não houver registros |
| GET | `/contents/:id` | `200` | Busca um conteúdo pelo ID |
| POST | `/contents` | `201` | Cria um conteúdo e retorna o cabeçalho `Location` |
| PUT | `/contents/:id` | `200` | Substitui todos os campos editáveis de um conteúdo |
| DELETE | `/contents/:id` | `204` | Exclui o conteúdo e suas visualizações por cascata do banco, sem corpo na resposta |
| POST | `/content-views` | `201` | Registra a primeira visualização de um conteúdo por usuário |
| GET | `/content-views/users/:userId` | `200` | Lista as visualizações do usuário |
| GET | `/content-views/contents/:contentId` | `200` | Lista as visualizações do conteúdo |

### Dados e validações de usuários

Para criar um usuário, envie JSON com `name` e `email`. O campo `status` é opcional no POST e assume `active`:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "status": "active"
}
```

No PUT, os três campos são obrigatórios. Não existe atualização parcial via PATCH na API.

Nomes e e-mails têm os espaços das extremidades removidos, e o e-mail é convertido para letras minúsculas. O nome deve ser uma string não vazia, o e-mail deve ter formato válido e o status aceita somente `active` ou `inactive`. Campos desconhecidos, inclusive `id`, `created_at` e `updated_at`, são rejeitados; IDs e timestamps são gerados pelo banco.

O parâmetro `:id` deve ser um inteiro positivo, sem zeros à esquerda, até `9223372036854775807`. As respostas usam IDs como strings. A listagem busca páginas adicionais internamente para lidar com o limite de resultados do Supabase; não há parâmetros públicos de paginação implementados.

| Código HTTP | Situação |
| --- | --- |
| `400` | Dados ou ID inválidos, JSON malformado ou violação de restrições de dados |
| `404` | Usuário não encontrado na busca, atualização ou exclusão |
| `409` | E-mail duplicado ou tentativa de excluir usuário associado a cursos ou módulos |
| `413` | Corpo da requisição excede o limite aceito pelo Express |
| `500` | Falha inesperada, com mensagem genérica sem detalhes internos do banco |

### Dados e validações de cursos

Para criar um curso, envie `user_id` como string, `code` e `title`. A descrição é opcional no POST e, quando omitida, é armazenada como `null`:

```json
{
  "user_id": "1",
  "code": "COURSE-004",
  "title": "Example Course",
  "description": "Course description"
}
```

No PUT, os quatro campos são obrigatórios, incluindo `description`, que pode receber `null` para remover o texto. A atualização permite alterar o criador do curso. Não há endpoint PATCH.

- `user_id` deve ser uma string com um inteiro positivo, sem zeros à esquerda, até `9223372036854775807`; números JSON são rejeitados para preservar a precisão. A mesma faixa vale para `:id`.
- `code` e `title` devem ser strings não vazias após a remoção dos espaços externos. A migration não define tamanho máximo nem formato específico; a API não acrescenta esses limites. O código mantém suas maiúsculas e minúsculas, conforme a unicidade do PostgreSQL.
- `description` aceita string ou `null`. Strings têm espaços externos removidos e podem ficar vazias.
- Campos desconhecidos, inclusive `id`, `created_at` e `updated_at`, são rejeitados. O banco gera os IDs e timestamps.
- `id` e `user_id` são retornados como strings. A listagem busca páginas adicionais internamente, sem parâmetros públicos de paginação.
- Não há restrição adicional baseada no status do criador; o vínculo é validado pela chave estrangeira existente.

| Código HTTP | Situação em cursos |
| --- | --- |
| `400` | ID, corpo ou campos inválidos; violações das restrições de dados |
| `404` | Curso não encontrado na busca, atualização ou exclusão |
| `409` | Código duplicado; criador inexistente no POST/PUT; curso com módulos no DELETE |
| `413` | Corpo da requisição excessivamente grande |
| `500` | Falha inesperada de banco ou rede, sem exposição de detalhes internos |

O erro PostgreSQL `23503` é tratado conforme a operação: criação e atualização retornam `The specified user does not exist.`, enquanto exclusão retorna `Cannot delete a course linked to modules.`. O POST retorna o curso criado e `Location: /courses/:id`; o DELETE bem-sucedido retorna `204` sem corpo. As constraints do banco garantem a unicidade e a integridade referencial.

### Dados e validações de módulos

Para criar um módulo, envie `course_id` e `user_id` como strings e `title` como texto não vazio. A descrição é opcional no POST e, quando omitida, é armazenada como `null`:

```json
{
  "course_id": "1",
  "user_id": "2",
  "title": "Introduction",
  "description": "Module overview"
}
```

No PUT, os quatro campos são obrigatórios, incluindo `description`, que aceita `null` para remover o texto. É permitido alterar o curso e o criador, respeitando as chaves estrangeiras. Não há endpoint PATCH.

- `:id`, `course_id` e `user_id` devem representar inteiros positivos, sem zeros à esquerda, até `9223372036854775807`. Os IDs no JSON devem ser strings; números são rejeitados para preservar a precisão.
- `title` deve ser uma string não vazia após `trim()`. Não há formato específico, limite adicional de tamanho nem unicidade de título.
- `description` aceita string ou `null`. Strings têm espaços externos removidos e podem ficar vazias.
- Campos desconhecidos ou gerados pelo banco, como `id`, `created_at` e `updated_at`, são rejeitados.
- O criador do módulo pode ser diferente do criador do curso. Não existe restrição adicional baseada no status do usuário.
- As respostas incluem `id`, `course_id`, `user_id`, `title`, `description`, `created_at` e `updated_at`, com os três IDs como strings.
- A listagem busca páginas adicionais internamente, sem parâmetros públicos de paginação.

| Código HTTP | Situação em módulos |
| --- | --- |
| `400` | ID, corpo ou campos inválidos; violações das restrições de dados |
| `404` | Módulo não encontrado na busca, atualização ou exclusão |
| `409` | Curso ou usuário inexistente no POST/PUT; módulo com conteúdos no DELETE |
| `413` | Corpo da requisição excessivamente grande |
| `500` | Falha inesperada de banco ou rede, sem exposição de detalhes internos |

As chaves estrangeiras garantem os vínculos com cursos e usuários. No POST/PUT, o erro PostgreSQL `23503` retorna `The specified course or user does not exist.`. No DELETE, o mesmo código retorna `Cannot delete a module linked to contents.`, pois a exclusão de módulos com conteúdos é bloqueada por `ON DELETE RESTRICT`. A API não exclui os conteúdos automaticamente.

O POST retorna o módulo criado e `Location: /modules/:id`; o DELETE bem-sucedido retorna `204` sem corpo.

### Dados e validações de conteúdos

POST e PUT exigem os três campos editáveis: `module_id`, `title` e `content`:

```json
{
  "module_id": "1",
  "title": "Introduction",
  "content": "  # Lesson\n\n  Formatted learning material.\n"
}
```

- `module_id` deve ser uma string com um inteiro positivo, sem zeros à esquerda, até `9223372036854775807`. A mesma faixa vale para `:id`. Números JSON são rejeitados para preservar a precisão.
- `title` deve ser uma string não vazia após `trim()` e tem os espaços externos removidos.
- `content` deve ser uma string cujo `trim()` não seja vazio. **O texto original é preservado integralmente na gravação**, incluindo espaços nas extremidades, tabulações e quebras de linha.
- A migration não define unicidade, formato específico ou limite de tamanho para título e texto; a API não acrescenta essas restrições. O limite global de tamanho do corpo JSON do Express continua valendo.
- Campos desconhecidos, inclusive `description`, `id`, `created_at` e `updated_at`, são rejeitados. Os IDs e timestamps são gerados pelo banco.
- O PUT substitui os três campos editáveis e permite alterar o módulo associado. Não há endpoint PATCH.
- As respostas incluem `id`, `module_id`, `title`, `content`, `created_at` e `updated_at`, com ambos os IDs como strings.
- A listagem busca páginas adicionais internamente, sem parâmetros públicos de paginação.

| Código HTTP | Situação em conteúdos |
| --- | --- |
| `400` | ID, corpo ou campos inválidos; violações das restrições de dados |
| `404` | Conteúdo não encontrado na busca, atualização ou exclusão |
| `409` | Módulo referenciado inexistente no POST/PUT |
| `413` | Corpo da requisição excessivamente grande |
| `500` | Falha inesperada de banco ou rede, sem exposição de detalhes internos |

A chave estrangeira garante que `module_id` referencie um módulo existente. O erro PostgreSQL `23503` no POST/PUT retorna `The specified module does not exist.`. O POST retorna o conteúdo criado e `Location: /contents/:id`.

A migration define `user_content_views.content_id` com `ON DELETE CASCADE`: excluir um conteúdo também remove suas visualizações. A API faz somente a exclusão em `contents`, sem consultas ou exclusões manuais em `user_content_views`, e retorna `204` sem corpo. Visualizações existentes não impedem a exclusão. Isso é diferente da exclusão de um módulo com conteúdos, que continua bloqueada por `ON DELETE RESTRICT`.

### Registro e consulta de visualizações

Para registrar uma visualização, envie os dois IDs como strings:

```json
{
  "user_id": "1",
  "content_id": "2"
}
```

O PostgreSQL preenche `watched_at` com `now()` quando o campo é omitido. Para informar o momento da visualização, inclua um timestamp com fuso explícito:

```json
{
  "user_id": "1",
  "content_id": "2",
  "watched_at": "2026-10-01T10:00:00.123456-03:00"
}
```

O POST retorna `201` com `user_id`, `content_id` e `watched_at`. A tabela não possui um campo `id` próprio. Os dois IDs são retornados como strings para preservar a precisão do BIGINT.

- `user_id`, `content_id`, `:userId` e `:contentId` devem representar inteiros positivos, sem zeros à esquerda, até `9223372036854775807`. No JSON, apenas strings são aceitas.
- `watched_at` é opcional. Quando informado, deve ser uma string no formato `YYYY-MM-DDTHH:mm:ss[.fração]Z` ou com deslocamento `±HH:mm`, com calendário e horário válidos. Não são aceitos `null`, datas sem fuso ou datas impossíveis. A API não converte o valor antes de enviá-lo ao banco.
- Não há restrição adicional sobre datas futuras ou status do usuário.
- Somente `user_id`, `content_id` e `watched_at` são aceitos no corpo do POST.
- A constraint única `(user_id, content_id)` rejeita uma segunda inserção com `409`, mesmo que outro timestamp seja enviado. O timestamp original é preservado; não há `upsert`, atualização automática ou contagem de repetições.
- As chaves estrangeiras garantem a existência de usuário e conteúdo no registro. Referências inexistentes retornam `409`.

As consultas verificam primeiro a existência do usuário ou conteúdo: retornam `404` para uma entidade inexistente e `200` com `[]` para uma entidade existente sem visualizações. A consulta por usuário ordena por `content_id`; a consulta por conteúdo ordena por `user_id`. Ambas buscam páginas adicionais internamente, sem parâmetros públicos de paginação.

| Código HTTP | Situação em visualizações |
| --- | --- |
| `201` | Visualização registrada |
| `200` | Consulta concluída, inclusive lista vazia |
| `400` | Corpo, IDs ou timestamp inválidos; violações de dados |
| `404` | Usuário ou conteúdo da consulta inexistente |
| `409` | Par já registrado (`23505`) ou referência inexistente no POST (`23503`) |
| `413` | Corpo da requisição excessivamente grande |
| `500` | Falha inesperada de banco ou rede, sem detalhes internos |

Duplicidades retornam `This user has already viewed this content.`. Referências inexistentes no POST retornam `The specified user or content does not exist.`. Não existem endpoints para editar ou excluir visualizações. A remoção decorrente da exclusão de usuários ou conteúdos continua a cargo do `ON DELETE CASCADE` existente.

Os endpoints atuais não possuem autenticação ou autorização de usuários.

## Coleção Postman

A coleção [Course Management System](docs/postman/course-management-system.postman_collection.json) está no formato **Postman Collection v2.1**. Contém **24 requisições**: as 23 operações dos CRUDs e visualizações, mais uma repetição proposital de visualização para verificar o conflito `409`.

### Importar e executar

1. Inicie o backend com `npm run dev` ou pelo Docker Compose, conforme as instruções anteriores.
2. No Postman, selecione **Import** e abra `docs/postman/course-management-system.postman_collection.json`.
3. Nas variáveis da coleção, confira `baseUrl`, cujo valor padrão é `http://localhost:3001`. A coleção permite apenas HTTP local (`localhost` ou `127.0.0.1`) com porta explícita. Não informe URL ou chave do Supabase.
4. Use uma versão atual do Postman com suporte a `pm.execution.skipRequest()`. Abra **Run collection**, mantenha **todas as 24 requisições selecionadas na ordem salva**, sem arquivo de dados, e comece com uma iteração. Não configure execução paralela das requisições.
5. Execute somente em um ambiente de desenvolvimento autorizado e confira os resultados em **Test Results**. O `409` de **Reject Duplicate Content View** é esperado e conta como sucesso.

**Executar a coleção faz escritas reais no banco configurado pelo backend**, mesmo que `baseUrl` seja local. A análise e a validação automatizada da coleção não executam essas requisições contra o Supabase. Os testes de interface com a API em memória também não substituem esta verificação de integração.

### Sequência e dados temporários

A ordem é: criar/listar/buscar/editar usuário; repetir esses passos para curso, módulo e conteúdo; registrar visualização; tentar a duplicidade; consultar por usuário e conteúdo; excluir conteúdo, módulo, curso e usuário. Os vínculos apontam exclusivamente para os registros criados pela própria execução. A remoção da visualização fica a cargo da cascata do banco ao excluir o conteúdo.

A primeira requisição gera um identificador aleatório da execução, e-mails e código de curso exclusivos. Os IDs são capturados automaticamente das respostas `201`, validados como strings BIGINT e usados em `{{userId}}`, `{{courseId}}`, `{{moduleId}}` e `{{contentId}}`. O primeiro `watched_at` é guardado para confirmar que a duplicidade não o altera.

Os IDs e os marcadores de propriedade usam variáveis locais do Runner (`pm.variables`), que não persistem após o fim da execução, conforme a [documentação do Postman](https://learning.postman.com/docs/use/send-requests/variables/variables/). Não é necessário preencher IDs manualmente. O nome interno `cmsRunState` é reservado e não pode existir em variáveis de coleção, ambiente, globais ou arquivos de dados. Variáveis de ambiente ou arquivos de dados com os mesmos nomes não substituem os IDs registrados pelas guardas dos scripts.

### Proteções e limitações da limpeza

- Uma requisição dependente sem registro criado e confirmado nesta execução é bloqueada com `pm.execution.skipRequest()`. Isso também protege PUT e DELETE enviados isoladamente ou fora de ordem; use o Runner completo para o fluxo reproduzível.
- A captura exige `201`, ID válido, campos correspondentes ao corpo exclusivo enviado e cabeçalho `Location` correto. A limpeza não usa IDs fixos, resultados de listagens ou buscas por e-mail para escolher registros.
- Cada DELETE exige prova local de criação na mesma execução e mesma URL base. O DELETE de um pai é bloqueado se a exclusão de algum filho da execução não tiver retornado `204`.
- Se a execução for interrompida, se houver timeout após uma inserção ou se uma resposta não puder ser confirmada, podem permanecer registros temporários. Não há limpeza ampla nem tentativa de adivinhar IDs. Investigue os registros pelo identificador exclusivo da execução e obtenha autorização antes de qualquer limpeza manual.
- Os scripts verificam códigos HTTP, JSON, vínculos, valores atualizados, IDs como strings, conteúdo formatado, duplicidade, preservação do timestamp e ausência de corpo em respostas `204`. Requisições bloqueadas aparecem como ignoradas e devem ser investigadas, não consideradas uma execução integral bem-sucedida.

Não use **Send** em **Create User** para iniciar um fluxo manual: variáveis locais não são mantidas entre envios independentes, e isso pode deixar um cadastro temporário sem limpeza automática. Para repetir o teste, execute novamente a coleção completa; cada iteração inicia um novo conjunto de dados.

## Verificação e testes

### Verificação de TypeScript

```sh
npm run typecheck
```

Verifica os tipos da aplicação e dos scripts sem gerar arquivos compilados.

### Testes automatizados das rotas

```sh
node --import tsx --test tests/*.test.cjs
```

Os testes usam credenciais fictícias e interceptam as chamadas ao Supabase, sem acessar o banco real. Cobrem a rota inicial, os CRUDs de usuários, cursos, módulos e conteúdos, validações, registros inexistentes, listagem em múltiplas páginas, IDs grandes, conflitos, JSON inválido, corpo excessivamente grande e falhas de banco ou rede. Os testes de cursos também verificam o `user_id` como string, a descrição opcional ou nula, a ausência de limites arbitrários para código e título e a distinção do erro `23503` entre escrita e exclusão. Os testes de módulos cobrem separadamente referências a cursos e usuários inexistentes em POST e PUT, além da exclusão bloqueada por conteúdos no DELETE. Também verificam os três IDs BIGINT, os campos obrigatórios, a descrição e a aceitação de títulos repetidos. Os testes de conteúdos verificam a preservação exata do texto formatado em POST e PUT, as referências a módulos inexistentes em cada operação e a exclusão sem manipulação manual de visualizações. O conjunto de visualizações verifica registro com timestamp explícito ou gerado pelo banco, duplicidade sem atualização, conflitos de referências, consultas por usuário e conteúdo, ausência de registros, paginação, IDs grandes e timestamps inválidos. Esses testes simulam as respostas e não validam as constraints em um banco real; testes de escrita no Supabase dependem de autorização específica. A remoção efetiva das visualizações por cascata também depende de verificação real autorizada; o teste simulado confirma apenas que a API delega a exclusão ao banco.

O arquivo `tests/apiDocs.test.cjs` também verifica que a documentação corresponde às rotas existentes, que as referências locais dos schemas são resolvidas e que a interface e seus arquivos são servidos sem chamadas ao banco. O teste de CORS continua verificando as origens locais permitidas.

Não existe um script `npm test` definido no `package.json`; utilize o comando acima.

### Teste de conexão com o Supabase

Depois de configurar o `.env` e o banco:

```sh
npm run test:db
```

Esse comando realiza uma consulta real, somente de leitura, e exibe a contagem de usuários. Ele não cria, atualiza ou exclui registros. Os testes simulados e a verificação de TypeScript não comprovam que a migration foi aplicada nem que a conexão real está funcionando; essa confirmação depende da execução das verificações no ambiente configurado.

## Funcionalidades concluídas e pendentes

### Implementadas no repositório

- [x] Frontend React com TypeScript, Vite e CSS responsivo, com dashboard, CRUDs e visualizações.
- [x] Backend Express com TypeScript em camadas.
- [x] Dockerfiles e Compose para backend e frontend, usando Supabase remoto.
- [x] Documentação Swagger UI em `/api-docs` e especificação OpenAPI em `/api-docs.json`.
- [x] Cliente Supabase configurado por variáveis de ambiente.
- [x] CRUD de usuários com validações e tratamento de erros.
- [x] CRUD de cursos com validações, identificação do criador e tratamento de conflitos.
- [x] CRUD de módulos com vínculos a cursos e criadores e tratamento de exclusão bloqueada por conteúdos.
- [x] CRUD de conteúdos com preservação do texto formatado, vínculo a módulos e exclusão delegada à cascata do banco.
- [x] Testes automatizados das rotas de usuários, cursos, módulos e conteúdos com respostas simuladas do Supabase.
- [x] Script de verificação da conexão com o banco, somente de leitura.
- [x] Migration com as cinco tabelas, relacionamentos, restrições, índices, triggers e RLS.
- [x] Script de população com dados de exemplo.
- [x] Cinco relatórios SQL do projeto acadêmico.
- [x] Registro e consulta de visualizações por usuário ou conteúdo, com rejeição de duplicidades e testes simulados.

### Pendentes

- [ ] Testes reais de integração de escrita e de integridade no Supabase, mediante autorização.

Autenticação e implantação em hospedagem externa não estão implementadas. A prioridade do projeto é concluir os requisitos funcionais do backend. A existência das tabelas, do seed e dos relatórios SQL não significa que as respectivas APIs estejam disponíveis ou que esses scripts já tenham sido executados em cada ambiente.

## Integrantes

- Leonardo Michaki — [GitHub](https://github.com/LeoMichaki30)
- Matheus Grisard — [GitHub](https://github.com/MatheusGrisard)
- Lohana Santos — [GitHub](https://github.com/lohsantxs)
