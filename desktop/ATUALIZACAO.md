# Atualização do AURA Pad sem reinstalar

**Regra de ouro: o usuário decide.** Nada é baixado, aplicado ou reiniciado sem o clique dele, e ele sempre vê o que mudou antes.

**Fluxo**
1. O app procura atualização **uma vez, ao abrir** (4 s depois). Sem busca contínua.
2. Se houver versão nova, aparece o selo **NOVA VERSÃO** no cabeçalho (sobre a tela de licença, se ela estiver aberta). A janela não abre sozinha.
3. Ao clicar, o usuário vê **"o que mudou"** (todas as versões desde a dele) e escolhe **ATUALIZAR AGORA** ou **AGORA NÃO**.
4. Só ao atualizar: o app grava a interface nova ao lado do app e reinicia. Setlists, kits, ajustes, MIDI e licença não são tocados.

**O que vai por atualização:** só a interface (`index.html`, `style.css`, `app.js`, `knob.js`, `stagelab.js`, `pager.js`, `licenca.js`, `update.js`, `catalog.json`, manifest e ícones). Os **sons (`audio/`, `sf/`) ficam no instalador**.
**Som novo ou pad novo no catálogo exige reinstalar**: aumente `SHELL_API` em `desktop/src/main.js` e `AURA_NEEDS_SHELL` no workflow; o app mostra BAIXAR O INSTALADOR.

**"O que mudou" é obrigatório.** Vem de `desktop/novidades.json` (versão mais nova no topo: `version`, `date`, `titulo`, `itens` em linguagem de músico). O gerador recusa publicar sem `itens`. **A cada mudança de interface, acrescente uma entrada nova no topo, com versão maior.**

**Segurança.** Só vale pacote assinado (Ed25519). Chave pública em `desktop/src/main.js` (`UPDATE_PUB`); chave privada no segredo `AURA_UPDATE_KEY` do repositório. Assinatura e hash de cada arquivo são conferidos na procura, na instalação e a cada abertura. Se uma versão nova não abrir bem 3 vezes seguidas, o app volta para a interface do instalador.

**Publicação.** Push em `main` que mude a interface ou `desktop/**` roda `.github/workflows/desktop.yml`: gera os instaladores e, no job `atualizacao`, o `aura-update.json` (número = `github.run_number`), enviado à Release `v1.0.0`. Sem o segredo, o job só avisa e os instaladores saem normalmente.

**Teste:** `node tests/atualizacao.js`.
