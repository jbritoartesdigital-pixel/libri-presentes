# Libri Presentes — V1 FINAL

Produto: listas de presentes e cotas para casamentos, chá de panela, casa nova, noivado e eventos relacionados.

## O que esta V1 entrega

### Área Libri — `/admin`
- cria evento
- define slug
- define identidade visual
- define estilo da experiência
- envia preview 16:9
- gera acesso exclusivo da cliente
- regenera acesso se necessário

### Painel da cliente — `/c/{token}`
- cadastro e edição dos próprios desejos
- biblioteca de ideias prontas
- "Monte minha lista"
- cotas
- cotas criativas
- experiências
- presentes físicos
- ícones prontos
- foto opcional por desejo
- foto comprimida no navegador antes do upload
- Pix
- confirmação real de contribuições
- reservas físicas
- confirmação de recebimento
- link + QR Code
- ativar / desativar
- excluir definitivamente

### Página pública — `/e/{slug}`
- experiência mobile-first
- identidade do evento
- progresso geral e por ambiente
- filtros de categoria
- filtros por faixa de valor
- cotas compartilhadas
- Pix contextual por desejo
- QR Pix + copia e cola
- recado opcional
- presente físico via Pix OU compra livre
- reserva temporária
- estados concluídos
- preview Open Graph personalizado

### Reserva do convidado — `/r/{token}`
- link pessoal
- confirma quando realmente comprou
- pode cancelar
- casal confirma quando recebeu

## Regra estrutural

RESERVADO != COMPRA INFORMADA != RECEBIDO

PIX INFORMADO != PIX CONFIRMADO

Somente valores confirmados pela cliente alimentam o progresso.

## Mídia

GitHub contém apenas o motor.

Fotos e previews:
- comprimidos no navegador
- enviados ao R2
- removidos do R2 na troca/exclusão quando aplicável

Meta:
- foto de presente: ~60 KB
- preview: ~170 KB

## Antes do ÚNICO deploy final

O repositório já deve ter:

- D1 `libri-presentes-db`
- R2 `libri-presentes`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_DEPLOY_TOKEN`

Adicionar apenas mais um Repository Secret:

`LIBRI_ADMIN_KEY`

Use uma senha/chave longa que somente a Libri conheça.

## Deploy

Substituir o conteúdo do repositório pelos arquivos desta V1.

Depois:

GitHub → Actions → Publicar Libri Presentes → Run workflow

O mesmo workflow:
1. aplica a migration 0002
2. publica Worker + Assets
3. grava `ADMIN_KEY` como Worker Secret

## Primeiro uso

1. Abra:
   `https://presentes.libriconvites.com.br/admin`

2. Entre com o valor salvo em:
   `LIBRI_ADMIN_KEY`

3. Crie um evento.

4. Copie o link da cliente.

5. Na Área Libri, envie o preview e ajuste identidade.

6. A cliente entra no próprio link, configura Pix e cadastra desejos.

7. Ative a lista.

## Observação importante sobre Pix

O app NÃO recebe nem intermedeia dinheiro.

O QR/copia-e-cola é gerado para a chave Pix da própria cliente.
O convidado informa que pagou.
A cliente verifica no banco e confirma o recebimento.

Isso mantém:
- controle real de quem informou o presente
- validação real pela cliente
- zero comissão sobre o valor do presente
- Libri fora da intermediação financeira

## Cloudflare

Domínio esperado:
`presentes.libriconvites.com.br`

Worker:
`libri-presentes`

D1:
`libri-presentes-db`

R2:
`libri-presentes`

## Status

V1 fechada para primeiro deploy integral.
