FROM python:3.12-slim-bookworm

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    USE_TF=0 \
    USE_TORCH=1 \
    TOKENIZERS_PARALLELISM=false \
    HF_HOME=/home/laya/.cache/huggingface

ARG LAYA_VERSION=0.3.7
ARG TORCH_INDEX=cpu
ARG TORCH_SPEC=torch>=2.2,<3

RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
RUN pip install --index-url "https://download.pytorch.org/whl/${TORCH_INDEX}" "${TORCH_SPEC}" \
    && pip install "laya[serve]==${LAYA_VERSION}" \
    && pip check
RUN groupadd --gid 10001 laya \
    && useradd --uid 10001 --gid laya --create-home laya \
    && mkdir -p "$HF_HOME" \
    && chown -R laya:laya /home/laya/.cache

USER laya
WORKDIR /home/laya
EXPOSE 8000
CMD ["laya-serve"]
