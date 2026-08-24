FROM node:24-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY catalog.json /catalog.json
COPY templates/ /templates/
COPY document-types/ /document-types/
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-install-project
COPY backend/app ./app
COPY catalog.json /catalog.json
COPY templates/ /templates/
COPY document-types/ /document-types/
RUN uv sync --locked
COPY --from=frontend-builder /frontend/out ./static

ENV STATIC_DIR=/app/static
ENV DB_PATH=/app/data/app.db
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
