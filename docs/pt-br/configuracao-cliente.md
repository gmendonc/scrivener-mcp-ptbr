# Configuração do cliente MCP

Variáveis de ambiente e armadilhas conhecidas ao usar este fork num cliente MCP (Claude desktop,
Claude Code e outros). Origem: relatório de erros (`scrivener-mcp-erros-encontrados.md`) e SPEC
§15, RC.13.

## Bloco `env` no Claude desktop

As variáveis entram no bloco `env` do servidor em `claude_desktop_config.json`. Depois de
editar, reinicie o cliente.

```json
{
  "mcpServers": {
    "scrivener": {
      "command": "node",
      "args": ["/caminho/para/scrivener-mcp-ptbr/dist/index.js"],
      "env": {
        "SCRIVENER_MCP_EAGER_TOOLS": "1",
        "SCRIVENER_MCP_LANGUAGE": "pt-BR",
        "ANTHROPIC_API_KEY": "…"
      }
    }
  }
}
```

| Variável | Para quê | Padrão |
|---|---|---|
| `SCRIVENER_MCP_EAGER_TOOLS` | `1` registra todas as ferramentas na inicialização | só o skill `project`; o resto aparece por `use_skill` |
| `SCRIVENER_MCP_LANGUAGE` | idioma padrão (`en` ou `pt-BR`) quando o projeto não tem idioma gravado | detecção pelo texto |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY` | provedor das ferramentas de IA | nenhum; sem chave, só *sampling* do cliente, se houver |
| `OPENAI_MODEL` | modelo OpenAI | `gpt-4o-mini` |
| `OPENAI_REASONING_EFFORT` | `minimal`, `low`, `medium` ou `high` para modelos de raciocínio (série o, GPT-5 em diante) | `low` |
| `SCRIVENER_MCP_SPOOL_DIR` | pasta onde ficam resultados grandes (`read_result`) | diretório temporário do sistema |

## Ferramentas que não aparecem (erro 1)

O servidor começa com poucas ferramentas e avisa o cliente com
`notifications/tools/list_changed` quando um skill é ativado. Clientes que ignoram esse aviso
(o Claude desktop, no teste do autor) nunca mostram `write_document`, `create_document` e as
demais. Solução: `SCRIVENER_MCP_EAGER_TOOLS=1`. Custo: as definições de todas as ferramentas
ocupam contexto desde o início da conversa.

## Projeto no iCloud (erro 2)

Com o projeto em `~/Library/Mobile Documents/…`, o `open_project` pode ficar sem resposta: o
controle de privacidade do macOS (TCC) e o File Provider bloqueiam a leitura pelo processo que
o cliente inicia, sem erro. Mova o projeto para uma pasta local (por exemplo
`~/Documents/Scrivener`) ou conceda ao cliente acesso à pasta em Ajustes do Sistema →
Privacidade e Segurança. O servidor não tem timeout para esse caso (SPEC §3).

## Modelos de raciocínio da OpenAI (erro 15)

Para a série o e GPT-5 em diante, o servidor envia `max_completion_tokens` (4 × o limite pedido,
mínimo 4000) e `reasoning_effort`, e não envia `temperature`. As temperaturas dos prompts (0,2
para análise, 0,8 para geração) não valem para esses modelos.

## Ferramentas de IA sem provedor (erro 17)

Sem chave de API, as ferramentas de IA só funcionam se o cliente oferecer *sampling* do MCP. A
mensagem de erro cita as três variáveis acima.

## Modo assíncrono sem Redis (erro 22)

`async: true` e as ferramentas `queue_*` usam KeyDB/Redis quando há um disponível; sem ele, a
fila embutida (SQLite em `.scrivener-mcp/` dentro do projeto) assume sozinha. Nenhuma
configuração é necessária.

## Gravações (erro 20)

`write_document` grava antes de responder. Ainda assim, com o projeto aberto no Scrivener, as
duas gravações podem se sobrescrever: feche o projeto no Scrivener ou salve antes de usar
ferramentas de escrita.

## Resultados grandes (erro 21)

Respostas acima de 4000 caracteres são gravadas em disco; a resposta traz `_ref` e o caminho em
`_file`. `read_result` com `resultId = _ref` funciona sempre, porque quem lê o arquivo é o
servidor. `SCRIVENER_MCP_SPOOL_DIR` só importa para abrir o arquivo diretamente (por exemplo,
no Finder ou em outra ferramenta), já que o diretório temporário do sistema costuma ficar fora
das pastas a que o cliente tem acesso.
