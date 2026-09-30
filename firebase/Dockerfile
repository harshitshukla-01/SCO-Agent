FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g firebase-tools@13.34.0

WORKDIR /app

COPY firebase.json firestore.rules firestore.indexes.json ./

EXPOSE 9099 8080 4000

CMD ["bash", "-lc", "firebase emulators:start --project soc-agent-demo --config firebase.json --only auth,firestore --import=/data --export-on-exit=/data"]
