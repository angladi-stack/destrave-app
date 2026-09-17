# Destrave by Angladi — base funcional

Esta versão preserva as oito telas oficiais em `assets/reference` e adiciona a estrutura funcional para testes.

## O que já funciona

- navegação entre as oito telas;
- login de teste com validação e sessão persistente;
- formulário “Faça por mim” com objetivo, assunto e formatos;
- geração local automática quando a API não estiver configurada;
- conexão segura preparada para Gemini por função de servidor;
- salvamento local dos conteúdos gerados;
- stories interativos, checklists, modais, filtros e edição do perfil de trabalho;
- menu flutuante de demonstração removido.

## Teste local

Requer Node.js compatível com o Expo SDK 57 (mínimo 22.13).

```bash
npm install
npm run web
```

Para gerar a versão web:

```bash
npm run build:web
```

## Ativar o Gemini no Netlify

1. Faça o deploy do repositório.
2. Nas variáveis de ambiente do site, crie `GEMINI_API_KEY`.
3. Faça um novo deploy.

A chave fica somente na função `netlify/functions/generate.mjs` e nunca é enviada no código público do aplicativo. Sem a chave, o Destrave continua funcionando no modo local de teste.

## Próxima etapa de produção

Para vender acessos a clientes, substituir o login de demonstração por autenticação real e sincronizar perfil e histórico em um banco de dados. A estrutura visual não precisa ser alterada.
