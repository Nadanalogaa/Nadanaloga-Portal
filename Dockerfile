# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Set default PORT for Cloud Run
ENV PORT=8080

# Start the server
CMD ["node", "server.js"]