# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Layer Structure

This template is split into local Nuxt layers (`~/layers`):

- `layers/base` - data layer and infrastructure (runtime config, API routes, server handlers, composables, plugins, providers, shared utils).
- `layers/ui` - presentation layer (pages, layouts, components, global styles, app shell).

Nuxt auto-registers both layers from `~/layers`. The `ui` layer has higher priority than `base` because of alphabetical order.

Important for local development:

- Run dev server from project root (`base_template_layer`), not from `layers/`.
- Use `pnpm dev` (it cleans accidental `layers/.nuxt` and `layers/node_modules` caches before start).

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

git submodule update --init --recursive
git submodule add git@github.com:mycoinber/starter_tmp.git templates/starter

git add .gitmodules templates/starter

cd templates/starter # Перейти в папку сабмодуля
git add . # Добавить изменения
git commit -m "Update submodule content" # Создать коммит
git push # Запушить изменения в репозиторий сабмодуля

#Обновляем темплейт
git add templates/starter
git commit -m "Обновлен сабмодуль templates/starter"
git push origin main # Или ваша основная ветка

git submodule foreach --recursive git pull origin main

git add remote origin git@github.com:mycoinber/starter_tmp.git
