# 🌅 Dawn — Task Tracker Discord Bot

Discord bot that turns each channel into a to-do list and epic tracker for game dev teams, with live-updating status messages per user.

---

## ✨ Features

- **Channel = Epic** — Each Discord channel maps to one epic/system, no manual tagging needed
- **Live Tracking** — Per-user task status messages are **edited in real time** instead of reposted, so the latest status is always visible
- **Full slash command set** — Create, assign, and close tasks without leaving Discord
- **SQLite (WAL mode)** — Single-file database, easy to back up, no separate database server required

## 🧱 Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js ≥ 22 |
| Language | TypeScript |
| Discord API | discord.js v14 |
| Database | better-sqlite3 (WAL mode) |
| Env config | dotenv |

## 📂 Project Structure

```
src/
├── commands/
│   ├── epic/       → /epic add · archive · delete · rename · unarchive
│   └── task/       → /task add · assign_date · assign_user · delete · done · list · myTask
├── db/             → SQLite connection and schema
├── utils/
│   ├── embeded/    → Epic embed builders
│   ├── statusTracker.ts / trackerNotifier.ts / userTracker.ts → Live Tracking system
│   ├── resolvedEpic.ts / channel.ts → channel ↔ epic resolution
│   └── slug.ts     → converts epic names into channel slugs
└── main.ts         → entry point
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/dawn-task-tracker.git
cd dawn-task-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from the Discord Developer Portal |
| `CLIENT_ID` | Your bot's Application ID (used to register slash commands) |
| `DEV_GUILD_ID` | (Optional) Guild ID for fast command syncing during development |
| `DATABASE_PATH` | Path to the SQLite file (defaults to `./data/taskbot.sqlite` if unset) |

> 💡 Coming back to this project years from now? Check `.env.example` — it always lists every variable you need.

### 4. Build and run

```bash
npm run build   # compile TypeScript → dist/
npm start       # run the bot from dist/bot.js
```

Or use watch mode during development:

```bash
npm run dev
```

## 🛠️ Commands

### `/epic`
| Command | Description |
|---|---|
| `add` | Create a new epic (auto-creates a channel + pins an embed) |
| `archive` | Archive a completed epic |
| `unarchive` | Restore an archived epic |
| `rename` | Rename an epic |
| `delete` | Permanently delete an epic |

### `/task`
| Command | Description |
|---|---|
| `add` | Add a new task to the current epic |
| `list` | List all tasks in the epic |
| `myTask` | Show only the tasks assigned to you |
| `assign_user` | Assign a task to a team member |
| `assign_date` | Set a due date for a task |
| `done` | Mark a task as complete |
| `delete` | Delete a task |

## 📦 Deployment

This project works with [bot-hosting.net](https://bot-hosting.net) or any Node.js host that supports native modules (`better-sqlite3`).

**Note:** `better-sqlite3` is a native module and must be built for your host's OS. If the bot fails to start after deploying, try deleting `node_modules` and restarting to force a fresh, correctly-built install.

## 🤝 Contributing

Built by a student team for the game **กาลวินาศ (Galwinat)**. Contributions welcome via pull request.

## 📄 License

MIT

# 🌅 Dawn — Task Tracker Discord Bot

Discord bot that turns each channel into a to-do list and epic tracker for game dev teams, with live-updating status messages per user.

บอท Discord ที่เปลี่ยนทุกแชนแนลให้เป็น to-do list และ epic tracker สำหรับทีมพัฒนาเกม พร้อมข้อความสถานะที่อัปเดตแบบเรียลไทม์ของแต่ละคน

---

## ✨ Features

- **Channel = Epic** — แต่ละแชนแนล Discord ผูกกับ 1 epic/ระบบ ไม่ต้องแท็กงานเอง
- **Live Tracking** — ข้อความสรุปสถานะ task ของแต่ละคนถูก **edit แบบเรียลไทม์** แทนการโพสต์ข้อความใหม่ทุกครั้ง เปิดมาแล้วเห็นสถานะล่าสุดทันที
- **Slash Commands ครบวงจร** — สร้าง/มอบหมาย/ปิดงานได้จากคำสั่งเดียว ไม่ต้องสลับแอป
- **SQLite (WAL mode)** — เก็บข้อมูลในไฟล์เดียว, backup ง่าย, ไม่ต้องพึ่ง database server แยก

## 🧱 Tech Stack

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| Runtime | Node.js ≥ 22 |
| Language | TypeScript |
| Discord API | discord.js v14 |
| Database | better-sqlite3 (WAL mode) |
| Env config | dotenv |

## 📂 Project Structure

```
src/
├── commands/
│   ├── epic/       → /epic add · archive · delete · rename · unarchive
│   └── task/       → /task add · assign_date · assign_user · delete · done · list · myTask
├── db/             → การเชื่อมต่อและ schema ของ SQLite
├── utils/
│   ├── embeded/    → สร้าง embed สำหรับ epic
│   ├── statusTracker.ts / trackerNotifier.ts / userTracker.ts → ระบบ Live Tracking
│   ├── resolvedEpic.ts / channel.ts → resolve channel ↔ epic
│   └── slug.ts     → แปลงชื่อ epic เป็น channel slug
└── main.ts         → entry point
```

## 🚀 Getting Started

### 1. Clone repository

```bash
git clone https://github.com/<your-username>/dawn-task-tracker.git
cd dawn-task-tracker
```

### 2. ติดตั้ง dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

คัดลอกไฟล์ตัวอย่างแล้วกรอกค่าจริง:

```bash
cp .env.example .env
```

เปิด `.env` แล้วใส่ค่าตามนี้:

| ตัวแปร | คำอธิบาย |
|---|---|
| `DISCORD_TOKEN` | Bot Token จาก Discord Developer Portal |
| `CLIENT_ID` | Application ID ของบอท (ใช้ตอน register slash command) |
| `DEV_GUILD_ID` | (ถ้ามี) Guild ID สำหรับ sync command แบบเร็วตอน dev |
| `DATABASE_PATH` | Path ของไฟล์ SQLite (ถ้าไม่ตั้ง จะ default เป็น `./data/taskbot.sqlite`) |

> 💡 กลับมาโปรเจกต์นี้อีกกี่ปีก็ไม่ต้องนึกว่าต้องตั้งตัวแปรอะไรบ้าง — เช็คที่ `.env.example` ได้เลย

### 4. Build และรันบอท

```bash
npm run build   # compile TypeScript → dist/
npm start       # รันบอทจาก dist/bot.js
```

หรือระหว่างพัฒนา ใช้โหมด watch:

```bash
npm run dev
```

## 🛠️ Commands

### `/epic`
| คำสั่ง | หน้าที่ |
|---|---|
| `add` | สร้าง epic ใหม่ (สร้าง channel + pin embed อัตโนมัติ) |
| `archive` | เก็บ epic ที่เสร็จแล้ว |
| `unarchive` | นำ epic กลับมาใช้งาน |
| `rename` | เปลี่ยนชื่อ epic |
| `delete` | ลบ epic ถาวร |

### `/task`
| คำสั่ง | หน้าที่ |
|---|---|
| `add` | เพิ่ม task ใหม่เข้า epic ปัจจุบัน |
| `list` | แสดงรายการ task ทั้งหมดใน epic |
| `myTask` | แสดงเฉพาะ task ของตัวเอง |
| `assign_user` | มอบหมายผู้รับผิดชอบ |
| `assign_date` | กำหนด due date |
| `done` | ปิดงานที่เสร็จแล้ว |
| `delete` | ลบ task |

## 📦 Deployment

โปรเจกต์นี้ใช้งานได้กับ [bot-hosting.net](https://bot-hosting.net) หรือ host Node.js ทั่วไปที่รองรับ native module (`better-sqlite3`)

**ข้อควรระวัง:** `better-sqlite3` เป็น native module ต้อง build ให้ตรงกับ OS ของ host — ถ้า deploy แล้วบอทไม่ start ให้ลองลบ `node_modules` แล้ว restart เพื่อบังคับให้ install บิลด์ที่ถูกต้องใหม่

## 🤝 Contributing

โปรเจกต์นี้พัฒนาโดยทีมนักศึกษาเพื่อใช้กับเกม **กาลวินาศ** — เปิดรับ contribution ผ่าน pull request ปกติ

## 📄 License

MIT