# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24.19.0-bookworm-slim

FROM ${NODE_IMAGE} AS runtime

ARG PNPM_VERSION=9.15.4
ARG GITLEAKS_VERSION=8.30.1
ARG TARGETARCH

ENV TZ=Asia/Taipei \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global pnpm@${PNPM_VERSION} \
    && npm cache clean --force

RUN set -eux; \
    gitleaks_target_arch="${TARGETARCH:-$(dpkg --print-architecture)}"; \
    case "${gitleaks_target_arch}" in \
        amd64) \
            gitleaks_asset_arch='x64'; \
            gitleaks_sha256='551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' \
            ;; \
        arm64) \
            gitleaks_asset_arch='arm64'; \
            gitleaks_sha256='e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080' \
            ;; \
        *) \
            echo "Unsupported Gitleaks architecture: ${gitleaks_target_arch}" >&2; \
            exit 1 \
            ;; \
    esac; \
    gitleaks_archive='/tmp/gitleaks.tar.gz'; \
    curl -fsSL \
        "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${gitleaks_asset_arch}.tar.gz" \
        -o "${gitleaks_archive}"; \
    echo "${gitleaks_sha256}  ${gitleaks_archive}" | sha256sum --check --strict; \
    tar -xzf "${gitleaks_archive}" -C /usr/local/bin gitleaks; \
    chmod 0755 /usr/local/bin/gitleaks; \
    rm -f "${gitleaks_archive}"

# 原始碼以 bind mount 掛入，擁有者是 host 或 CI runner 的 uid；
# 容器以 PUID 執行時 git 會判定為 dubious ownership，gitleaks git 會因此失敗。
RUN git config --system --add safe.directory /workspace
