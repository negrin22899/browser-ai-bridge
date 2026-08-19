# Browser AI Bridge — headless server image
# Runs the OpenAI-compatible API in native API mode (no browser needed):
#   docker run -e OPENAI_API_KEY=sk-... -p 3000:3000 bab
# For browser providers, run the desktop app or CLI on a host with Chrome.

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
COPY examples ./examples

RUN npm ci --no-audit --no-fund && npm run build

FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production
COPY --from=build /app ./

EXPOSE 3000

CMD ["node", "apps/cli/dist/index.js", "serve", "--host", "0.0.0.0", "--port", "3000", "--api", "openai"]
