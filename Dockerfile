# ---- Stage 1: deps ----
    FROM node:20-alpine AS deps
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci
    
    # ---- Stage 2: builder ----
    FROM node:20-alpine AS builder
    WORKDIR /app
    ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    ARG NEXT_PUBLIC_POSTHOG_HOST
    ENV NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=$NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    RUN npm run build
    
    # ---- Stage 3: runner ----
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static
    
    EXPOSE 3000
    CMD ["node", "server.js"]