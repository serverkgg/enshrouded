FROM ubuntu:24.04

ARG BRIDGE_VERSION
ARG PROTON_VERSION=11-12
ARG PROTON_SHA512=2e37447902529c9fc39138dc0b3f24aed3513b59a190b825e6b4a668e49e2033bdf6b8a7998e8686e067bbb3f61f3a6633e2408f0cc96f6dad983bd18e2db31e

LABEL gg.serverk.bridge.version="${BRIDGE_VERSION}"

LABEL org.opencontainers.image.source="https://github.com/serverkgg/enshrouded"
LABEL gg.serverk.game="enshrouded"
LABEL gg.serverk.proton="GE-Proton${PROTON_VERSION}"

# tini is PID 1. curl fetches Proton and SteamCMD at build time. util-linux carries
# setpriv, which the bridge falls back on. procps is what a drill uses to read the
# process group. python3 runs /opt/proton, which is a Python script. The lib32 trio is
# SteamCMD and Proton's 32-bit side; GE-Proton bundles its own Wine, so no i386 dpkg
# architecture is added. libfreetype6 and libvulkan1 are dlopened by Proton. xvfb and
# xauth give the headless boot a display.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      tini ca-certificates curl util-linux procps tzdata locales python3 \
      lib32gcc-s1 lib32stdc++6 lib32z1 libfreetype6 libvulkan1 xvfb xauth; \
    rm -rf /var/lib/apt/lists/*; \
    locale-gen en_US.UTF-8; \
    if getent passwd 1000 > /dev/null; then \
      userdel -r "$(getent passwd 1000 | cut -d: -f1)"; \
    fi; \
    groupadd -g 1000 container; \
    useradd -M -d /home/container -u 1000 -g 1000 -s /usr/sbin/nologin container; \
    mkdir -p /home/container /serverk/run /opt/serverk /opt/steamcmd; \
    curl -fsSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz \
      | tar -xz -C /opt/steamcmd; \
    chmod -R a+rX /opt/steamcmd; \
    tr -d '-' < /proc/sys/kernel/random/uuid > /etc/machine-id

# Its own layer so a driver rebuild reuses the 570 MB download. GE-Proton 11 is the floor,
# since the 1.0 server's Steamworks fails under GE-Proton 10 with No SteamUtils011. The
# release is pinned and checksummed; an unpinned Proton is a silent game-breaking change
# on every rebuild.
RUN set -eux; \
    mkdir -p /opt/proton; \
    curl -fsSL -o /tmp/proton.tar.gz \
      "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton${PROTON_VERSION}/GE-Proton${PROTON_VERSION}-x86_64.tar.gz"; \
    echo "${PROTON_SHA512}  /tmp/proton.tar.gz" | sha512sum -c -; \
    tar -xzf /tmp/proton.tar.gz --strip-components=1 -C /opt/proton; \
    rm -f /tmp/proton.tar.gz; \
    rm -rf /opt/proton/files/share/wine/mono /opt/proton/files/share/wine/gecko \
      /opt/proton/files/share/espeak-ng-data /opt/proton/files/share/libtashkeel_model.ort; \
    chmod -R a+rX /opt/proton; \
    test -x /opt/proton/proton

ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    TZ=UTC \
    HOME=/home/container

COPY image/enshrouded-start /opt/serverk/enshrouded-start

RUN chmod 0755 /opt/serverk/enshrouded-start

COPY dist/bridge /serverk/bridge

RUN chmod 0755 /serverk/bridge

WORKDIR /home/container

ENTRYPOINT ["/usr/bin/tini", "--", "/serverk/bridge"]
