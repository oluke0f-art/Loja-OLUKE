# OLUKE — Loja alimentada exclusivamente por Google Planilhas

A loja deste projeto foi alterada para ter **uma única fonte de dados: a Google Planilha**.

O fluxo é:

**Google Planilhas → Apps Script → site**

Não existe mais catálogo por pastas, `produto.json`, `categoria.json`, `data/catalog.json` ou lista de produtos no JavaScript.

## 1. O que mudou

O projeto antigo criava `data/catalog.json` lendo pastas dentro de `catalog/`. Essa estrutura foi removida.

Agora:

- cada linha da aba `Produtos` representa um produto;
- produtos desativados não aparecem;
- categorias são descobertas automaticamente pela coluna `Categoria`;
- `Destaque` controla a seção de destaques;
- `Ativo` controla se o produto aparece na loja;
- as fotos vêm de **Imagem na célula** do Google Planilhas;
- não é necessário Google Drive, URL de imagem ou pasta de produto;
- não existe painel administrativo no site.

## 2. Arquivos principais

- `index.html` — estrutura da página.
- `site.js` — renderização, busca, filtros e consumo do catálogo.
- `style.css` — design atual, preservado.
- `site.json` — conteúdo institucional/redes sociais do site.
- `config.js` — **único ponto de configuração do frontend**.
- `Code.gs` — API do Google Apps Script.
- `PLANILHA_MODELO.xlsx` — modelo para importar no Google Planilhas.

## 3. Estrutura da planilha

A primeira aba deve se chamar:

`Produtos`

A primeira linha deve conter **exatamente**:

| Coluna | Obrigatório | O que colocar |
|---|---|---|
| Nome | Sim | Nome do produto |
| Abreviação | Não | Sigla curta, como `S23U` |
| Categoria | Sim | Categoria do produto, por exemplo `Celulares` |
| Preço | Sim | Número, por exemplo `1599` ou `1599,90` |
| Destaque | Sim | Checkbox |
| Foto | Não | Imagem inserida diretamente na célula |
| Descrição | Não | Texto descritivo |
| Link | Sim | Link para a página do produto/afiliado |
| Ativo | Sim | Checkbox |

### Cabeçalho completo

```text
Nome | Abreviação | Categoria | Preço | Destaque | Foto | Descrição | Link | Ativo
```

### Campos obrigatórios

`Nome`, `Categoria`, `Preço`, `Link` e `Ativo`.

`Destaque` deve existir e usar checkbox; para novos produtos, deixe desmarcado quando não quiser destaque.

`Foto`, `Abreviação` e `Descrição` podem ficar vazios.

## 4. Checkbox: Destaque e Ativo

No Google Planilhas:

1. Selecione a coluna `Destaque` a partir da linha 2.
2. Vá em **Inserir → Caixa de seleção** (ou **Checkbox**, dependendo do idioma da interface).
3. Faça o mesmo na coluna `Ativo`.

Significado:

- `Destaque` marcada → produto aparece nos destaques.
- `Destaque` desmarcada → produto não aparece nos destaques.
- `Ativo` marcada → produto aparece na loja.
- `Ativo` desmarcada → produto não aparece na loja.

O Apps Script também aceita `TRUE/FALSE` caso a importação do XLSX não converta automaticamente a validação em checkbox.

## 5. Importar a planilha modelo

Dentro deste ZIP existe:

`PLANILHA_MODELO.xlsx`

No Google Drive:

1. Clique em **Novo → Upload de arquivo**.
2. Escolha `PLANILHA_MODELO.xlsx`.
3. Abra o arquivo.
4. Escolha **Abrir com → Google Planilhas**.
5. Se necessário, salve/converta para o formato nativo do Google Planilhas.
6. Confirme que a aba se chama `Produtos`.

O modelo já possui:

- todos os cabeçalhos;
- ordem correta;
- 3 produtos de exemplo;
- categorias de exemplo;
- preços;
- descrições;
- abreviações;
- `Destaque`;
- `Ativo`;
- validação TRUE/FALSE nas colunas binárias.

### Se os checkboxes não forem preservados

Isso pode variar conforme a conversão/importação do XLSX.

No Google Planilhas:

1. Selecione `E2:E` (Destaque).
2. **Inserir → Caixa de seleção**.
3. Selecione `I2:I` (Ativo).
4. **Inserir → Caixa de seleção**.

Depois disso, use somente as caixas de seleção.

## 6. Como colocar a imagem — sem URL e sem Google Drive

Esta é uma exigência do projeto.

Na coluna `Foto`:

1. Clique na célula do produto.
2. Vá em **Inserir → Imagem → Imagem na célula**.
3. Escolha a foto no computador.
4. Aguarde o upload terminar.
5. Não cole URL.
6. Não crie uma pasta no Google Drive.
7. Não faça upload manual da foto para o Drive.
8. Não coloque arquivo de imagem dentro deste projeto.

O fluxo é simplesmente:

**Planilha → Foto → Inserir → Imagem → Imagem na célula**

O Apps Script identifica o valor como `CellImage`, obtém a URL de conteúdo temporária fornecida pelo Google e, dentro do próprio Apps Script, busca os bytes atuais da imagem e os entrega ao site em Base64. Isso evita deixar o navegador dependente diretamente da URL temporária do Google.

A documentação oficial do Google confirma que `CellImage.getContentUrl()` fornece uma URL hospedada pelo Google e que essa URL expira após um curto período. Também confirma que `CellImage` é o tipo `ValueType.IMAGE`. Por isso o projeto faz a recuperação no servidor em vez de guardar essa URL como dado permanente.

## 7. Qualidade das imagens

O site não redimensiona, recomprime ou converte propositalmente a imagem recuperada.

O Apps Script lê os bytes retornados pelo Google e os transforma em Base64 para o navegador. O CSS pode mostrar a imagem em tamanho menor no card, mas isso é apenas apresentação visual.

**Limitação importante:** o Google controla o armazenamento e a entrega interna da `CellImage`. A API não fornece uma garantia pública de que todos os bytes serão sempre entregues sem qualquer transformação interna. O projeto preserva a maior representação que a API disponibilizar; não existe um mecanismo suportado para acessar diretamente um arquivo original privado da infraestrutura do Google.

## 8. Criar categorias

Não crie categoria no código.

Para criar uma categoria nova, basta escrever uma categoria nova na coluna `Categoria`.

Exemplo:

```text
Celulares
Acessórios
Notebooks
Smartwatches
```

Se `Smartwatches` aparecer em uma linha de produto ativo, o site reconhecerá essa categoria automaticamente.

Não existe arquivo `categoria.json`.

## 9. Cadastrar um produto

Adicione uma nova linha:

```text
Nome: Samsung Galaxy S23 Ultra
Abreviação: S23U
Categoria: Celulares
Preço: 1599
Destaque: ☑
Foto: Imagem na célula
Descrição: Smartphone...
Link: https://exemplo.com/produto
Ativo: ☑
```

Não crie pasta, JSON ou arquivo adicional.

## 10. Configurar o Apps Script

### 10.1 Abra a planilha

Abra a planilha que será usada como banco da loja.

### 10.2 Abra o Apps Script

Na própria planilha:

**Extensões → Apps Script**

Apague o código existente e cole o conteúdo de:

`Code.gs`

Salve.

**Importante:** o `Code.gs` deste projeto foi feito para ser um script **vinculado à planilha**. Não transforme o script em um projeto independente.

Isso elimina a necessidade de colocar o ID da planilha no frontend.

### 10.3 Autorizações

Na primeira execução/publicação, o Google poderá pedir autorização.

O script precisa ler a planilha e buscar o conteúdo das imagens inseridas como `CellImage`.

Aceite as permissões solicitadas para a conta proprietária da loja.

## 11. Publicar como Web App

No Apps Script:

1. Clique em **Implantar**.
2. Escolha **Nova implantação**.
3. Tipo: **Aplicativo da Web**.
4. Execute o aplicativo como: **você/conta proprietária**.
5. Em quem tem acesso, escolha uma opção que permita acesso público ao Web App, normalmente **Qualquer pessoa**.
6. Clique em **Implantar**.
7. Copie a URL que termina em `/exec`.

Não coloque essa URL neste README.

## 12. Configurar o site

Abra:

`config.js`

Você verá:

```js
const OLUKE_CONFIG = Object.freeze({
  GOOGLE_SHEETS_WEB_APP_URL: ""
});
```

Cole somente a URL do Web App:

```js
const OLUKE_CONFIG = Object.freeze({
  GOOGLE_SHEETS_WEB_APP_URL: "https://script.google.com/macros/s/SEU_ID/exec"
});
```

Esse é o único local do frontend que precisa ser alterado.

O ID da planilha não é colocado no site porque o `Code.gs` está vinculado diretamente à planilha.

## 13. Compartilhamento da planilha

O visitante não precisa editar a planilha.

A forma recomendada é deixar a planilha com acesso de visualização apropriado ao funcionamento público do site e impedir edição por visitantes.

O Apps Script roda com a conta proprietária e lê a planilha no servidor.

**Nunca coloque senha, token privado ou credencial de Google no `site.js`, `config.js` ou HTML.**

## 14. Atualização da loja

A cada carregamento da página, o site solicita novamente o catálogo ao Web App.

Não existe `data/catalog.json` e não existe build de produtos.

Portanto:

1. altere a planilha;
2. salve;
3. recarregue a loja.

A mudança será buscada novamente.

O código usa `cache: "no-store"` no navegador e adiciona um parâmetro de data à requisição para evitar que uma resposta antiga do navegador seja usada como catálogo atual.

## 15. O que acontece se houver erro

Se o Apps Script não responder:

- a página não é destruída;
- a área da loja mostra uma mensagem amigável;
- o erro é registrado no console.

Se uma linha tiver dados inválidos:

- uma linha inválida é ignorada;
- os demais produtos continuam carregando;
- os avisos ficam disponíveis no console.

Exemplos de linha ignorada:

- preço inválido;
- categoria vazia;
- link vazio;
- erro inesperado ao ler a linha.

Produto com `Ativo` desmarcado é simplesmente excluído do catálogo público.

## 16. Busca e filtros

O mecanismo de busca/filtros existente do site continua sendo usado.

A alteração principal foi somente a origem dos dados:

**antes**

```text
pastas → build.js → data/catalog.json → site.js
```

**agora**

```text
Google Planilhas → Apps Script → site.js
```

## 17. Sistema antigo removido

Foram removidos do projeto final:

- `catalog/`;
- pastas individuais de produtos;
- `produto.json`;
- `categoria.json`;
- `data/catalog.json`;
- `build.js`;
- catálogo hardcoded de produtos;
- catálogo hardcoded de categorias;
- a cópia duplicada `oluke-site/oluke-site/`;
- o repositório Git duplicado que estava dentro do ZIP.

Não há dois sistemas de catálogo funcionando simultaneamente.

## 18. Teste inicial

Depois de configurar o Web App:

1. confirme que a aba é `Produtos`;
2. confirme os 9 cabeçalhos;
3. confirme `Ativo` marcado nos 3 exemplos;
4. marque `Destaque` em pelo menos um;
5. insira uma imagem na célula `Foto`;
6. coloque a URL do Web App em `config.js`;
7. execute o servidor:

```bash
npm run serve
```

8. abra:

```text
http://127.0.0.1:8080
```

Não abra `index.html` com duplo clique.

## 19. Teste de atualização

Para testar se a loja está realmente usando a planilha:

### Teste 1 — novo produto

Adicione uma nova linha.

Recarregue o site.

O produto deve aparecer.

### Teste 2 — categoria

Troque:

```text
Celulares
```

por:

```text
Smartphones
```

Recarregue.

O produto deve aparecer em `Smartphones`.

### Teste 3 — destaque

Marque `Destaque`.

Recarregue.

O produto deve aparecer nos destaques.

Desmarque.

Ele deve sair dos destaques.

### Teste 4 — ativo

Desmarque `Ativo`.

Recarregue.

O produto não deve aparecer em nenhuma parte da loja.

### Teste 5 — imagem

Troque a imagem usando novamente:

**Inserir → Imagem → Imagem na célula**

Recarregue.

A nova imagem deve ser buscada pela loja.

## 20. Limitação técnica das imagens

Existe uma limitação importante da própria plataforma Google.

A documentação oficial informa que `CellImage.getContentUrl()` retorna uma URL hospedada pelo Google e que essa URL:

- é temporária;
- é associada à conta que solicitou o conteúdo;
- pode perder acesso se as permissões da planilha mudarem.

Por isso o projeto **não grava essa URL como cadastro permanente**.

O Apps Script busca a URL no momento da solicitação e recupera o conteúdo para entregar ao site.

Isso mantém o fluxo solicitado sem transformar o Google Drive em um sistema de cadastro de imagens.

## 21. Checklist final

- [x] Google Planilha é a fonte dos produtos.
- [x] Google Planilha gera as categorias.
- [x] `Destaque` usa checkbox.
- [x] `Ativo` usa checkbox.
- [x] Produtos inativos não aparecem.
- [x] Não há `produto.json`.
- [x] Não há `categoria.json`.
- [x] Não há `catalog/`.
- [x] Não há `data/catalog.json`.
- [x] Não há `build.js`.
- [x] Não há painel administrativo.
- [x] Não há cadastro de imagem por URL.
- [x] Não há upload manual para uma pasta do Google Drive.
- [x] Imagens usam `Imagem na célula`.
- [x] A URL temporária da CellImage não é armazenada como cadastro permanente.
- [x] A loja continua sendo servida localmente em `127.0.0.1`.
- [x] A mesma configuração funciona no site publicado.
- [x] O layout, CSS, busca, filtros e navegação existentes foram preservados.

## 22. Arquivo de planilha

Use:

`PLANILHA_MODELO.xlsx`

Ele já contém 3 produtos de exemplo e a estrutura exata esperada pelo `Code.gs`.
