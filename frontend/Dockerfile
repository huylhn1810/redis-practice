FROM node:22.17.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite dev server dùng port 5173
EXPOSE 5173

# Bắt buộc có cờ --host để expose ra ngoài container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]