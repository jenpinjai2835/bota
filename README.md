# ⚔ BRAWL OF THE ANCIENTS

2.5D Multiplayer Brawler — 3-5 players per room, 10 characters, 3 stages

## Characters (10 ตัว)
| Icon | Name | Class | HP | Speed | Specialty |
|------|------|-------|-----|-------|-----------|
| 🐉 | DRAGONFIST | Brawler | 120 | 5 | ดาเมจสูง, dash |
| 🗡️ | SHADOWBLADE | Assassin | 80 | 7 | เร็วที่สุด, blink |
| 🛡️ | STONEGUARD | Tank | 200 | 3 | HP สูงสุด, charge |
| 🏹 | STORMARROW | Ranger | 90 | 5 | ยิงไกล, vine trap |
| 🔮 | PYROMANCER | Mage | 85 | 4 | AOE, meteor |
| ❄️ | FROSTMAGE | Mage | 85 | 4 | freeze, blizzard |
| ⚡ | THUNDERKING | Warrior | 110 | 5 | สมดุล, zeus wrath |
| 🐍 | VENOMFANG | Rogue | 88 | 6 | poison, gorgon gaze |
| ✨ | CELESTIAL | Healer | 95 | 5 | heal ตัวเอง, holy |
| 🤖 | IRONCLAD | Heavy | 180 | 3 | cannon, overdrive |

## Stages (3 ด่าน)
1. **Temple of Ruins** — โทนสีน้ำตาล-ทอง, กลาง
2. **Frost Citadel** — โทนสีฟ้า, platform แคบกว่า
3. **Thunder Peak** — โทนสีม่วง-เหลือง, platform หลายชั้น

## Controls
| Key | Action |
|-----|--------|
| WASD / Arrow | เคลื่อนที่ + กระโดด |
| Z | สกิล 1 (โจมตีพื้นฐาน) |
| X | สกิล 2 |
| C | สกิล 3 |
| V | Ultimate |
| Tab | Scoreboard |
| Enter | เปิด/ส่ง Chat |

---

## 🚀 Deploy วิธีที่ง่ายที่สุด — Railway (ฟรี)

### ขั้นตอน
1. สร้างบัญชี [railway.app](https://railway.app) (ล็อกอินด้วย GitHub)
2. สร้าง repo GitHub ใหม่ อัพโหลดไฟล์ทั้งหมดนี้
3. ใน Railway → New Project → Deploy from GitHub repo
4. เลือก repo → Deploy
5. Railway จะ build อัตโนมัติ ได้ URL เช่น `https://brawl-xxx.up.railway.app`
6. แชร์ URL นั้นให้เพื่อนเข้าเล่นได้เลย!

**ไฟล์ที่ต้องอัพขึ้น GitHub:**
```
server.js
index.html
package.json
railway.json
```

---

## 🚀 Deploy บน Render (ฟรีเหมือนกัน)

1. สมัคร [render.com](https://render.com)
2. New → Web Service → Connect GitHub repo
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Deploy!

**หมายเหตุ:** Render free tier จะ sleep หลัง 15 นาทีไม่มีคนใช้ (แต่ตื่นขึ้นมาได้)

---

## 🖥️ รันบนเครื่องตัวเอง (Local)

```bash
npm install
node server.js
# เปิด http://localhost:3000
```

### QC smoke test

Run the server-side match regression suite:

```bash
npm run qc:match
```

This checks creep group movement, tower polygon collision, restart speed stacking, objective order, creep death events, and tower hero targeting.

ถ้าจะให้เพื่อนในวง LAN เข้าเล่น ใช้ IP เครื่องคุณ เช่น `http://192.168.1.x:3000`

---

## Game Design

- **Room:** 3-5 คน, Host สร้างห้องได้รหัส 6 ตัว แชร์ให้เพื่อน join
- **Respawn:** ตายแล้วฟื้นใน 3 วินาที
- **Score:** Kill = 100 คะแนน
- **Skills:** แต่ละตัวมี 4 สกิล cooldown ต่างกัน (Z/X/C/V)
- **Multiplayer:** WebSocket realtime, sync ทุก 40ms
