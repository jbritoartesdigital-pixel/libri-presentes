# Libri Presentes

Motor inicial do Libri Presentes.

## Arquitetura aprovada

- GitHub: código-fonte
- GitHub Actions: publicação manual
- Cloudflare Worker: aplicação e APIs
- Cloudflare D1: eventos, desejos, contribuições, reservas e histórico
- Cloudflare R2: previews e fotos opcionais
- Página pública: `/e/{slug}`
- Área Libri: será `/admin`
- Área da cliente: será `/c/{token}`

## Importante

Esta versão é a FUNDAÇÃO TÉCNICA.
A experiência pública definitiva ainda NÃO está desenhada nesta etapa.

## Recursos que o banco já suporta

- evento ativo / inativo
- slug único
- cotas
- cotas criativas
- experiências
- presentes físicos
- Pix por desejo
- contribuição pendente / confirmada / rejeitada
- reserva física com expiração
- comprado / recebido
- imagem opcional por presente
- biblioteca por `icon_name`
- histórico operacional por evento
- exclusão com `ON DELETE CASCADE`

A remoção dos objetos do R2 será feita junto da futura API de exclusão do evento.

## Primeiro deploy

### 1. Criar os recursos Cloudflare

Criar um D1:

`libri-presentes-db`

Criar um bucket R2:

`libri-presentes`

### 2. Copiar o ID do D1

No `wrangler.jsonc`, substituir:

`COLE_O_DATABASE_ID_AQUI`

pelo `database_id` real do `libri-presentes-db`.

### 3. Criar o repositório GitHub

Nome sugerido:

`libri-presentes`

Subir esta estrutura completa.

### 4. Secrets do repositório

O workflow espera:

- `CLOUDFLARE_DEPLOY_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Podem seguir o mesmo padrão usado nos outros apps Libri.

### 5. Publicar

GitHub:

Actions → Publicar Libri Presentes → Run workflow

O workflow:

1. instala Wrangler;
2. aplica migrations remotas no D1;
3. publica o Worker.

### 6. Primeiro teste

Abrir a URL `workers.dev` gerada.

A tela deve mostrar:

`Worker conectado ✓`

Também pode testar:

`/api/health`

### 7. Domínio

Somente depois do primeiro deploy funcionar, ligar:

`presentes.libriconvites.com.br`

Assim evitamos misturar problema de código com configuração de domínio.

## Próxima etapa

Depois de o motor publicar corretamente:

1. Área Libri `/admin`
2. criação de evento
3. geração do acesso da cliente
4. painel da cliente
5. cadastro de desejos
6. upload/compressão de foto opcional
7. experiência pública `/e/{slug}`
8. Pix
9. confirmação real de recebimento
10. reservas
11. preview + QR
12. desativar e excluir evento
