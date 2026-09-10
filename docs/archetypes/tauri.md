# Arquétipo Tauri (desktop, N artefatos)

Referências: **PersonalNews** (web + desktop), **push_** (multiplataforma), **Mark-Lee** (híbrido).

## Quando usar

Projeto com app desktop Tauri que publica instaladores (deb/rpm/AppImage, nsis/msi, dmg) na Release.

## Caller com matriz multiplataforma

```yaml
name: Release

on:
  push:
    tags: ["v*"]

permissions:
  contents: write

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release:
    uses: mafhper/github-release-workflows/.github/workflows/release.yml@v1.0.2
    with:
      matrix: |-
        [
          { "os": "ubuntu-latest",  "args": "--bundles appimage,deb" },
          { "os": "windows-latest", "args": "--bundles nsis,msi" },
          { "os": "macos-latest",   "args": "--bundles dmg" }
        ]
```

Cada célula é um job de build (fail-fast desativado). `args` é repassado ao `tauri-action`; campos extras (ex.: `arch`) podem ser adicionados à célula.

## `release.config.json`

```jsonc
{
  "release": {
    "title": "PersonalNews",
    "tagline": "Boletim pessoal com aplicativo desktop.",
    "image": { "required": true, "granularity": "minor" },
    "notes": { "granularity": "minor" } // desktop documenta por minor (vX.Y.md)
  },
  "build": {
    "package_manager": "bun",
    "node": "24",
    "bun": "1.x",
    "rust": "stable",
    "apt": ["libwebkit2gtk-4.1-dev", "build-essential", "libxdo-dev"]
  },
  "desktop": {
    "enabled": true,
    "project_path": "."
  },
  "versions": {
    "files": [
      { "path": "desktop/src-tauri/tauri.conf.json", "format": "json", "field": "version" },
      { "path": "desktop/src-tauri/Cargo.toml", "format": "toml", "field": "package.version" }
    ]
  }
}
```

## Regras ativas

- `desktop.enabled: true` exige `build.rust`, proíbe `build.command` e `artifact` (o `tauri-action` publica os instaladores no release rascunho).
- `apt` é instalado apenas em runners Linux.
- Pelo menos `package.json` + `tauri.conf.json` + `Cargo.toml` devem bater com a tag.

## Observações

- O Release Core **não conhece** PersonalNews vs push_ vs Mark-Lee; a topologia é definida por célula da matrix (consome o rascunho do release de forma idempotente).
- Modelo 0..N: uma plataforma pode produzir vários instaladores (setup.exe + setup.msi), todos enviados.
- CI e deploy (Pages) ficam no consumidor. Projetos híbridos (web + desktop) usam o caller acima só para release; o Pages continua em workflow separado.
- Validações extras de conteúdo podem ser declaradas nos jobs ou via `gates` (ex.: `rustup` targets, testes).