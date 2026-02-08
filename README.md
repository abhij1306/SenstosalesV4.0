# SenstoSales ERP v4.0

A modern supplier-side ERP system for managing Purchase Orders, Delivery Challans, Sales Invoices, and Store Receipt Vouchers.

![Dashboard Preview](./docs/dashboard-preview.png)

## ✨ Features

### 📦 Document Lifecycle Management
- **Purchase Orders (PO)**: Create, import via HTML upload, and manage procurement contracts
- **Delivery Challans (DC)**: Generate DC documents linked to POs with auto-calculation
- **Sales Invoices**: GST-compliant invoice generation with auto-reconciliation
- **Store Receipt Vouchers (SRV)**: Track material receipts and quality acceptance
- **Auto-Reconciliation**: Automatically match DCs and Invoices to their source POs

### 🚚 Delivery Tracker
Real-time tracking of all dispatches with:
- Visual status indicators (Pending, Partial, Complete)
- Lot-wise delivery schedule management
- Remaining quantity calculations
- Timeline view of all deliveries

### 🔍 Global Search
Powerful cross-document search (Ctrl+K):
- Search across POs, DCs, Invoices, and SRVs simultaneously
- Filter by document type, date range, and amount
- Recent searches history
- Keyboard navigation support

### 📊 Procurement Analytics
Comprehensive dashboards and reports:
- PO value and volume trends
- Delivery performance metrics
- Invoice reconciliation status
- Deviation detection and reporting
- Dispatch summaries with GST breakdowns

### 📋 System Logs
Built-in diagnostic logging:
- API request/response tracking
- Performance monitoring
- Error diagnostics
- Debug mode with detailed traces

### ⚙️ Settings & Configuration
- Multi-buyer/company support
- GST configuration (rates, HSN codes)
- Company profile management
- Document preferences

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, React Query, Zustand |
| **Backend** | FastAPI, Python 3.11+, SQLite |
| **UI Components** | Radix UI, Hugeicons, Glassmorphism Design |
| **State Management** | Zustand (client), React Query (server state) |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhij1306/SenstosalesV4.0.git
   cd SenstosalesV4.0
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Initialize Database**
   
   The database (`db/business.db`) comes pre-loaded with demo data. To reset:
   ```bash
   python create_dummy_db.py
   ```
   
   This creates the SQLite database with sample suppliers, buyers, and demo documents.

5. **Configure (Optional)**
   - Start the app and go to Settings
   - Update company details
   - Add/modify buyer configurations

### Running the Application

**Option 1: Use the Launcher**
```bash
start.bat
```

**Option 2: Manual Start**

Terminal 1 (Backend):
```bash
cd backend
python entry_point.py
# API: http://localhost:8000
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# App: http://localhost:3000
```

## 📁 Project Structure

```
SenstosalesV4.0/
├── backend/               # FastAPI backend
│   ├── api/              # REST API endpoints
│   ├── services/         # Business logic
│   ├── repositories/     # Data access layer
│   ├── core/            # Core utilities
│   ├── db/              # Database models & session
│   └── scripts/         # Utility scripts
├── frontend/             # Next.js 16 frontend
│   ├── app/            # App Router pages
│   ├── components/     # React components
│   │   ├── common/     # Shared components
│   │   ├── modules/    # Feature modules
│   │   └── ui/         # UI primitives
│   ├── lib/            # Utilities & API client
│   ├── store/          # Zustand stores
│   └── types/          # TypeScript types
├── db/                  # Pre-loaded SQLite database
└── docs/               # Documentation
```

## 📖 Key Modules

| Module | Description |
|--------|-------------|
| **Purchase Orders** | Create manually or import from HTML, track PO status |
| **Delivery Challans** | Generate DCs with auto-calculated values, print-ready |
| **Invoices** | GST invoices with auto-reconciliation to DCs/POs |
| **SRV** | Store receipts with quality acceptance tracking |
| **Delivery Tracker** | Monitor all pending and completed deliveries |
| **Reports** | Analytics, dispatch summaries, deviation reports |
| **Settings** | Company, buyers, GST, and preferences |

## 🎨 Design System

- **Modern Glassmorphism UI** with blur effects
- **Dark/Light mode** ready
- **Responsive design** for all screen sizes
- **Hugeicons** icon library
- **Tailwind CSS** for styling

## 📚 Documentation

- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Setup and deployment
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Database structure
- [Backend Architecture](./docs/BACKEND_ARCHITECTURE.md) - API design
- [Design System](./docs/DESIGN_SYSTEM.md) - UI components
- [Business Logic Spec](./docs/BUSINESS_LOGIC_SPEC.md) - Module documentation
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues

## 🏗 Building for Production

```powershell
# Using PowerShell script
./scripts/build_release.ps1

# Output: dist/Senstosales_v4.0/
```

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

- Check [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- Open an issue on GitHub

---

**Built with ❤️ using Next.js + FastAPI**
