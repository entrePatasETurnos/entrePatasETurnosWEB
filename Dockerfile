# Runtime image for the site. It does NOT build anything: CI's "Production build" job produces
# site-standalone.tar.gz (Next.js standalone output plus .next/static), checksums it, and the
# "Container image" job verifies the checksum before this file runs. See
# specs/002-ci-docker-publish/contracts/container-image-contract.md.
#
# To build it locally, follow specs/002-ci-docker-publish/quickstart.md section 2.

# glibc, deliberately not alpine: the standalone output carries native packages (sharp, swc)
# traced on the Ubuntu runner that built it, and those only load against glibc. An alpine (musl)
# base would start fine and break the first time an optimised image was requested.
FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d

WORKDIR /app

# HOSTNAME=0.0.0.0: the standalone server binds to localhost otherwise, which is unreachable from
#   outside the container.
# API_BASE_URL is deliberately absent: it is read at runtime on the server, and the deployment sets
#   it. NEXT_PUBLIC_GOOGLE_CLIENT_ID is also absent, because it was already embedded in the browser
#   bundle at build time; setting it here would have no effect.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# ADD extracts a local tarball. Owned by the image's built-in non-root `node` user, so the
# server can write its own cache under .next/ and nothing runs as root.
ADD --chown=node:node site-standalone.tar.gz /app/

USER node

EXPOSE 3000

# Node's own fetch, because the slim image has no curl or wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "server.js"]
