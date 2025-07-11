# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments for environment variables
ARG VITE_POLYGON_API_KEY
ARG VITE_GEMINI_API_KEY

# Set environment variables from build args
ENV VITE_POLYGON_API_KEY=$VITE_POLYGON_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build the application (this is when Vite embeds the env vars)
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Set production environment variable
ENV NODE_ENV=production

# Expose port 3000
EXPOSE 3000

# Start the serve command
CMD ["npm", "start"]