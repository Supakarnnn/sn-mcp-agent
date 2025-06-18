# Step 1: Build stage
FROM node:18-alpine AS builder

# สร้าง working directory
WORKDIR /app

# คัดลอกไฟล์ package
COPY package.json package-lock.json* ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอก source code ทั้งหมด
COPY . .

# สร้าง production build
RUN npm run build

# Step 2: Production image
FROM node:18-alpine

# กำหนด working directory
WORKDIR /app

# คัดลอกไฟล์จำเป็นจาก builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# ตั้งค่า port ที่ Next.js ใช้งาน (default = 3000)
EXPOSE 3000

# รันแอปใน production mode
CMD ["npm", "start"]
