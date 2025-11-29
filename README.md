# AUDITRON - Full Stack Accounting Automation Platform

![AUDITRON Logo](auditron-web/public/logo.png)

## 🚀 Overview

AUDITRON is a production-ready, AI-powered accounting automation platform with a complete full-stack implementation featuring Next.js 14, Express backend, and comprehensive production infrastructure.

## ✨ Features

- **AI-Powered Automation**: Intelligent invoice processing and transaction categorization
- **Beautiful UI**: Modern glassmorphism design with golden wave backgrounds
- **Full Authentication**: Secure login and registration with JWT
- **Dashboard**: Complete accounting dashboard with reports and analytics
- **Production Ready**: CI/CD, monitoring, backups, and disaster recovery

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express
- **Language**: JavaScript
- **Authentication**: JWT + bcrypt
- **CORS**: Enabled

## 📦 Project Structure

```
MU_FIN/
├── auditron-web/          # Next.js Frontend
│   ├── app/               # App router pages
│   ├── components/        # Reusable components
│   ├── lib/              # Utilities
│   └── public/           # Static assets (logo)
│
├── auditron-simple-backend/  # Express API
│   ├── server.js         # Main server file
│   └── package.json      # Dependencies
│
└── auditron-backend/     # Advanced backend (optional)
    ├── src/              # Source code
    ├── docs/             # Documentation
    └── k8s/              # Kubernetes configs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd MU_FIN
```

2. **Install Frontend Dependencies**
```bash
cd auditron-web
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../auditron-simple-backend
npm install
```

### Running the Application

1. **Start the Backend** (Terminal 1)
```bash
cd auditron-simple-backend
npm start
```
Backend will run on: http://localhost:3000

2. **Start the Frontend** (Terminal 2)
```bash
cd auditron-web
npm run dev
```
Frontend will run on: http://localhost:3001

3. **Access the Application**
- Open http://localhost:3001 in your browser
- Click "Open Account" to register
- Or click "Sign In" to login

## 🎨 Design Features

- **Hexagonal Logo**: Modern 3-hexagon design
- **Golden Wave Background**: Flowing gradient effects
- **Glassmorphism**: Semi-transparent card designs
- **Dark Theme**: Professional dark color scheme
- **Responsive**: Works on all device sizes

## 🔐 Authentication

The app includes full authentication:
- User registration with organization details
- Secure login with JWT tokens
- Password hashing with bcrypt
- Protected routes

## 📱 Pages

- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/dashboard` - Main dashboard (protected)
- `/pricing` - Pricing plans
- `/reports` - Financial reports
- `/billing` - Billing management
- `/settings` - User settings

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice

### Health
- `GET /health` - API health check

## 🎯 Production Features

- ✅ CI/CD pipelines (GitHub Actions)
- ✅ Docker support
- ✅ Kubernetes manifests
- ✅ Monitoring (Prometheus + Grafana)
- ✅ Backup scripts
- ✅ Disaster recovery plan
- ✅ Comprehensive documentation

## 📚 Documentation

- [Architecture](auditron-backend/docs/ARCHITECTURE.md)
- [Deployment Guide](auditron-backend/docs/DEPLOYMENT.md)
- [Operations Runbook](auditron-backend/docs/RUNBOOK.md)
- [Disaster Recovery](auditron-backend/docs/DISASTER_RECOVERY.md)

## 🧪 Testing

```bash
# Frontend tests
cd auditron-web
npm test

# Backend tests
cd auditron-backend
npm test
```

## 🚢 Deployment

### Docker
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f auditron-backend/k8s/
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

AUDITRON Development Team

## 📞 Support

For support, email support@auditron.ai

---

**Built with ❤️ using Next.js, Express, and TypeScript**
