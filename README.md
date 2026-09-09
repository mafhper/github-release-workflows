# github-release-workflows

**Release Core** reutilizável para o portfólio `mafhper`: um protocolo de release confiável, idempotente e configurável para projetos **web**, **extensão** e **desktop/Tauri**.

> O projeto descreve sua distribuição. O Core executa o protocolo de release.

## Quem usa

- Spread (web)
- Kaes Keid Inspector (extensão)
- PersonalNews, push_, Mark-Lee (desktop/Tauri)

E qualquer projeto compatível: infraestrutura compartilhada, sem dependência de nomes.

## Como usar

1. Declare o caller em `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags: ["v*"]

permissions: {}

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release:
    uses: mafhper/github-release-workflows/.github/workflows/release.yml@v1.0.0
    with:
      matrix: '[{"os":"ubuntu-latest"}]'
    secrets: inherit
```

2. Configure `.github/release.config.json` — [contrato completo](docs/config-schema.md).

3. Inclua a imagem em `docs/images/releases/release.webp` e as notas em `.github/release-notes/` (granularidade declarada no contrato; documente no `README.md` das notas).

## O que ele faz

- Validação da tag contra `package.json` e `versions.files` (json/toml), **antes do build**
- Coerência obrigatória do gerenciador de pacotes (bun/npm com evidência de lockfile)
- Toolchain sob demanda (node/bun/rust/apt), gates, pre, build ou `tauri-action`
- Artefatos 0..N com validação executável, rename opcional e upload idempotente (`--clobber`)
- Política de imagem como hard gate (`major.minor`; configuravel por tag)
- Notas editoriais + changelog automático em `<details>`
- Prerelease detectado por semver
- Publicação idempotente (rascunho → publica; rerun seguro) e com retry
- Permissões mínimas: `permissions: {}` no caller, `contents: write` no Core

## Como versionar

O Core é uma API de automação. Consumidores fixam versões imutáveis (`@v1.0.0`); `@main` nunca é dependência permanente. Mudança incompatível → `v2.0.0`. Tags publicadas não devem ser movidas.

## Suporte

- Web (0 artefatos) — [arquétipo](docs/archetypes/web.md)
- Extensão (1 artefato ZIP) — [arquétipo](docs/archetypes/extension.md)
- Tauri (N artefatos, matrix por plataforma) — [arquétipo](docs/archetypes/tauri.md)

### Referências

| Documento | Conteúdo |
|---|---|
| [release-workflow.md](docs/release-workflow.md) | Arquitetura, fases, operação |
| [config-schema.md](docs/config-schema.md) | Contrato completo + defaults + regras |
| [archetypes/](docs/archetypes/) | Perfis web, extensão e Tauri |

## Estrutura

```text
.github/
├── workflows/
│   ├── release.yml          # Release Core (workflow_call)
│   ├── release-dogfood.yml  # este repositório consome o próprio Core
│   └── ci.yml               # actionlint + testes + shellcheck
├── release.config.json      # contrato do dogfood
└── release-notes/           # notas editoriais (vX.Y.Z.md)
docs/
├── release-workflow.md
├── config-schema.md
├── archetypes/{web,extension,tauri}.md
└── images/releases/release.webp
scripts/
├── release-config.mjs
├── check-release-version.mjs
└── release-body.sh
tests/
└── fixtures/{web,extension,tauri}
```

## Roadmap

Milestones para o portfólio (ver `.dev`): fundação do Core → CI consistente → rulesets de `main` e tags → Dependabot (Actions/npm) → CodeQL → deploy separado → matrix multiplataforma → repository health checks. Próximos P1 do Core: SHA-256, draft releases (plataformas required/opcional), diagnósticos aprimorados.