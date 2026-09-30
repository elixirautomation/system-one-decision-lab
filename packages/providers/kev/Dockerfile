FROM python:3.13-slim-bookworm

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TOKENIZERS_PARALLELISM=false \
    HF_HOME=/home/kev/.cache/huggingface

# Kev is not published to PyPI (the `kev` name there is an unrelated project),
# so the source is fetched from GitHub at a pinned commit and its own uv.lock
# decides every dependency version except torch, which comes from the CPU index.
ARG KEV_REPO=https://github.com/jaredpalmer/kev.git
ARG KEV_COMMIT=0c142becde423a0c68ec857f7831dac0315588a1
ARG UV_VERSION=0.12.20
ARG TORCH_INDEX=cpu
ARG TORCH_VERSION=2.8.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH

RUN git init /tmp/kev \
    && git -C /tmp/kev remote add origin "$KEV_REPO" \
    && git -C /tmp/kev fetch --depth 1 origin "$KEV_COMMIT" \
    && git -C /tmp/kev checkout --quiet FETCH_HEAD \
    && pip install "uv==${UV_VERSION}" \
    && cd /tmp/kev \
    && uv export --frozen --no-dev --extra serve --no-emit-project --no-hashes --no-annotate --no-header \
         | grep -vE '^(torch|triton|nvidia-|mlx)' > /tmp/requirements.txt \
    && pip install --index-url "https://download.pytorch.org/whl/${TORCH_INDEX}" "torch==${TORCH_VERSION}" \
    && pip install -r /tmp/requirements.txt \
    && pip install --no-deps /tmp/kev \
    && pip uninstall -y uv \
    && pip check \
    && rm -rf /tmp/kev /tmp/requirements.txt

RUN groupadd --gid 10001 kev \
    && useradd --uid 10001 --gid kev --create-home kev \
    && mkdir -p "$HF_HOME" \
    && chown -R kev:kev /home/kev/.cache

USER kev
WORKDIR /home/kev
ENV KEV_RUN=jaredpalmer/kev-0.8b \
    KEV_PORT=8009
EXPOSE 8009
CMD ["sh", "-c", "exec python -m kev.serve --run \"$KEV_RUN\" --host 0.0.0.0 --port \"$KEV_PORT\""]
