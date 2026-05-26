# Tertiary Training — Ubuntu lab container
#
# Ubuntu 24.04 + Node 24 + dev tools + ttyd (web-based terminal).
# Built once on the host, run 5 times with different ports.
#
# Build:  docker build -t tertiary-ubuntu:latest -f Dockerfile .
# Run:    docker run -d --name ubuntu-demo1 -p 8091:8091 -e PORT=8091 tertiary-ubuntu

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=7681
ENV LANG=C.UTF-8

# Base toolchain + dev essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget git \
    build-essential pkg-config \
    python3 python3-pip python3-venv \
    sudo \
    vim nano less \
    htop tmux net-tools iputils-ping dnsutils \
    software-properties-common gnupg lsb-release \
    file unzip zip tar jq tree \
    openssh-client \
    locales tzdata \
 && rm -rf /var/lib/apt/lists/*

# Node.js 24 from NodeSource, plus yarn + pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && npm install -g --silent npm@latest yarn pnpm \
 && rm -rf /var/lib/apt/lists/* /root/.npm

# ttyd — web-based terminal
ARG TTYD_VERSION=1.7.7
RUN ARCH=$(uname -m) \
 && case "$ARCH" in \
      x86_64)  TTYD_ARCH="x86_64" ;; \
      aarch64) TTYD_ARCH="aarch64" ;; \
      *)       echo "Unsupported arch: $ARCH" && exit 1 ;; \
    esac \
 && curl -fsSL -o /usr/local/bin/ttyd \
      "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.${TTYD_ARCH}" \
 && chmod +x /usr/local/bin/ttyd

# Non-root learner account with passwordless sudo
RUN useradd -m -s /bin/bash trainer \
 && echo "trainer ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/trainer \
 && chmod 0440 /etc/sudoers.d/trainer

# Friendly login banner shown when terminal opens
COPY --chown=trainer:trainer motd.txt /home/trainer/.tertiary-banner
RUN echo 'cat ~/.tertiary-banner 2>/dev/null' >> /home/trainer/.bashrc

USER trainer
WORKDIR /home/trainer

# Listen on $PORT (set per-container at run time so each demo binds to
# its own unique host port).
EXPOSE 7681
CMD ["sh", "-c", "ttyd -W -p ${PORT} bash -l"]
