# 🚀 MatrixTechX WhatsApp Bulk Messenger

A full-featured WhatsApp Marketing and Bulk Messaging Platform with WhatsApp Cloud API integration, analytics dashboard, campaign manager, template builder, team inbox, and contact management.

---

## ✨ Features

- **📊 Modern Dashboard**: Real-time campaign stats, delivery rates, and analytics graphs.
- **📣 Campaigns Manager**: Create, schedule, start, pause, and monitor bulk messaging campaigns.
- **📝 Template Management**: Sync templates directly with WhatsApp Cloud API or create custom templates with variables and buttons.
- **👥 Contacts & Groups**: CSV import/export, contact segmentation, and dynamic group filtering.
- **💬 Shared Team Inbox**: Real-time chat interface for customer conversations.
- **📈 Comprehensive Analytics**: Detailed delivery metrics (Sent, Delivered, Read, Failed).
- **⚙️ Settings & Integration**: Meta WhatsApp Cloud API credentials configuration and webhook management.
- **🎨 Live Widget Builder**: Customizable website chat widget with live preview.
- **🔐 Secure Authentication**: JWT-based session security and role-based access.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with `better-sqlite3`
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Dark Blue MatrixTechX Theme)
- **APIs**: Meta WhatsApp Cloud API v20.0

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/workshreeraminfotech-ux/matrixtechx-whatsapp-bulk-msg.git
cd matrixtechx-whatsapp-bulk-msg
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your WhatsApp Cloud API credentials in `.env`:
```env
PORT=3000
JWT_SECRET=your_secret_key_here

# WhatsApp Business Cloud API (Meta)
WHATSAPP_ACCESS_TOKEN=your_permanent_meta_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_account_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=matrixtechx_webhook_verify_2024

# Default Admin Login
ADMIN_EMAIL=admin@matrixtechx.com
ADMIN_PASSWORD=Admin@123456
```

### 4. Start the Application
```bash
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License
MIT License
