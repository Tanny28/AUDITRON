# AUDITRON Frontend - Developer Notes

## Quick Start

### 1. Install Dependencies

```bash
cd auditron-web
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
NEXT_PUBLIC_API_BASE=http://localhost:3000
NEXT_PUBLIC_STRIPE_PK=pk_test_your_stripe_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Important:** The backend API must be running on the port specified in `NEXT_PUBLIC_API_BASE`.

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

## Project Structure

```
auditron-web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── invoice/[id]/page.tsx
│   ├── reports/
│   │   ├── pnl/page.tsx
│   │   ├── balance-sheet/page.tsx
│   │   ├── gst/page.tsx
│   │   └── time-series/page.tsx
│   ├── pricing/page.tsx
│   ├── page.tsx (home)
│   ├── layout.tsx
│   ├── providers.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── FeatureCard.tsx
│   ├── StatsRow.tsx
│   ├── InvoiceUploader.tsx
│   ├── JobStatus.tsx
│   ├── ReconcilePanel.tsx
│   ├── ReportFilters.tsx
│   ├── ReportCard.tsx
│   ├── Sparkline.tsx
│   ├── ExportButtons.tsx
│   ├── DrilldownModal.tsx
│   └── Toast.tsx
├── lib/
│   ├── apiClient.ts
│   ├── hooks/
│   │   └── useAuth.ts
│   └── api/
│       ├── invoice.ts
│       ├── reconcile.ts
│       └── reports.ts
├── types/
│   ├── api.d.ts
│   └── reports.d.ts
└── public/
    └── assets/
        ├── logo.png
        └── wave.png
```

## API Integration

### API Client

The `lib/apiClient.ts` provides a typed wrapper around the Phase 1 backend API.

**Current Implementation:**
- Uses `localStorage` for token storage (development only)
- Tokens stored in plain text

**Production Recommendation:**
For production, switch to HttpOnly cookies:

1. **Backend Changes:**
   - Modify `/api/auth/login` and `/api/auth/register` to set HttpOnly cookie
   - Add `Set-Cookie` header with `httpOnly=true; secure=true; sameSite=strict`

2. **Frontend Changes:**
   - Remove `localStorage.setItem('auth_token', token)`
   - Cookies will be sent automatically with each request
   - Add CSRF protection

3. **Example Backend Cookie Setup:**
```typescript
// In Fastify backend
reply.setCookie('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/',
})
```

4. **Frontend API Client Update:**
```typescript
// Remove setToken() calls
// Cookies sent automatically via credentials: 'include'
const response = await fetch(url, {
  credentials: 'include', // Important!
  ...options
})
```

### Available API Methods

```typescript
// Auth
await apiClient.register({ email, password, firstName, lastName, organizationName, organizationEmail })
await apiClient.login({ email, password })
await apiClient.me()
apiClient.logout()

// Invoices
await apiClient.uploadInvoice(file)
await apiClient.listInvoices({ page, limit, status })
await apiClient.getInvoice(id)
await apiClient.startOCR(invoiceId)

// Transactions
await apiClient.listTransactions({ page, limit, category, isReconciled })

// Agents
await apiClient.getAgentJobStatus(jobId)
await apiClient.listAgentJobs()

// Billing
await apiClient.createCheckoutSession(priceId)

// Stats
await apiClient.getHomeStats()
```

## Reports & Analytics

### API Endpoints Used

```
GET  /api/reports/pnl?startDate={from}&endDate={to}
GET  /api/reports/balance-sheet?date={asOf}
GET  /api/reports/gst?startDate={from}&endDate={to}
GET  /api/reports/time-series?metrics={metrics}&from={from}&to={to}&granularity={granularity}
POST /api/reports/gst/generate
```

### Running Reports Locally

1. **Start Backend:**
```bash
cd ../auditron-backend
docker-compose up -d
npm run dev
```

2. **Seed Demo Data:**
```bash
npm run prisma:seed
```

3. **Access Reports:**
- P&L: `http://localhost:3001/reports/pnl`
- Balance Sheet: `http://localhost:3001/reports/balance-sheet`
- GST: `http://localhost:3001/reports/gst`
- Time Series: `http://localhost:3001/reports/time-series`

### Export Formats

**CSV Export:**
- Client-side generation using `exportToCSV()` function
- Proper escaping of quotes and commas
- Downloads immediately as `.csv` file

**PDF Export:**
- Client-side generation using `jsPDF`
- Basic table formatting
- Limited to ~30 rows per page
- For production, recommend server-side PDF generation with better formatting

**Server-Side PDF (Recommended for Production):**
```typescript
// Backend endpoint
POST /api/reports/pnl/export?format=pdf

// Returns PDF buffer or signed URL
```

### Chart Library

Using **Recharts** for all visualizations:
- Responsive charts
- Interactive tooltips
- Customizable styling
- Accessibility support

**Chart Types Used:**
- Bar Chart (P&L overview)
- Line Chart (Time series trends)
- Area Chart (optional for trends)

### Performance Tips

**1. Memoization:**
```typescript
const chartData = useMemo(() => {
  return report?.data.map(/* transform */)
}, [report])
```

**2. Pagination:**
- Limit chart data points to 50-100 max
- Use server-side aggregation for large datasets
- Implement virtual scrolling for tables

**3. Caching:**
```typescript
// Using React Query (already configured)
const { data } = useQuery({
  queryKey: ['pnl', from, to],
  queryFn: () => getPnl(from, to),
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

**4. Lazy Loading:**
- Load charts only when visible
- Use `React.lazy()` for report pages
- Implement code splitting

### Troubleshooting

**Chart Not Rendering:**
- Check console for errors
- Verify data format matches expected structure
- Ensure container has defined height
- Check Recharts version compatibility

**Large Data Load:**
- Implement server-side pagination
- Limit date ranges (max 12 months)
- Use aggregated data (monthly instead of daily)
- Show loading skeleton

**Export Fails:**
- Check browser download permissions
- Verify data is not empty
- For PDF, check jsPDF compatibility
- Use server-side export for large datasets

**SSE vs Polling:**
- SSE preferred for real-time updates
- Falls back to polling if SSE unavailable
- Polling interval: 2-3 seconds
- Stop polling on completion/error

## Assets

### Wave Overlay

Place your wave overlay image at:
```
public/assets/wave.png
```

**Recommended specs:**
- Format: PNG with transparency
- Dimensions: 1920x1080 or larger
- Color: Gold/yellow tones (#d4b861)
- Opacity: Will be set to 60% via CSS

To swap the wave:
1. Export your wave design as PNG
2. Replace `public/assets/wave.png`
3. Or pass custom path to `<Hero waveAsset="/path/to/wave.png" />`

### Logo

Place your logo at:
```
public/assets/logo.png
```

## Styling

### Design Tokens

Defined in `tailwind.config.js` and `app/globals.css`:

```css
--bg-dark: #0b0b0d
--text-white: #ffffff
--text-gray: #a1a1aa
--accent-gold: #d4b861
--glass-bg: rgba(255, 255, 255, 0.03)
--glass-border: rgba(255, 255, 255, 0.06)
```

### Utility Classes

```css
.glass-card - Glassmorphism card
.btn - Base button
.btn-primary - Primary button (white bg)
.btn-outline - Outlined button
.btn-gold - Gold button
.input - Form input
.gold-glow - Gold shadow effect
```

## Testing

### Run Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

## Building for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_BASE` - Your production API URL
   - `NEXT_PUBLIC_STRIPE_PK` - Stripe publishable key
4. Deploy

### Docker

```bash
docker build -t auditron-web .
docker run -p 3001:3000 -e NEXT_PUBLIC_API_BASE=https://api.auditron.ai auditron-web
```

## Connecting to Phase 1 Backend

1. Ensure backend is running:
```bash
cd ../auditron-backend
docker-compose up -d
npm run dev
```

2. Backend should be at `http://localhost:3000`

3. Test connection:
```bash
curl http://localhost:3000/health
```

4. Use demo credentials (from backend seed):
   - Admin: admin@auditron.ai / admin123
   - CA: ca@auditron.ai / ca123
   - User: user@auditron.ai / user123

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure backend `CORS_ORIGIN` includes your frontend URL:

```env
# In backend .env
CORS_ORIGIN=http://localhost:3001
```

### API Connection Failed

1. Check backend is running: `curl http://localhost:3000/health`
2. Verify `NEXT_PUBLIC_API_BASE` in `.env`
3. Check browser console for exact error

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## Next Steps

After Core Pages are validated:

1. ✅ **Auth System & API Client** - Cookie-based auth, refresh tokens
2. ✅ **Dashboard & Invoice Upload** - InvoiceUploader, JobStatus components
3. ✅ **Reports & Charts** - P&L, Balance Sheet, GST, Time-series visualizations
4. **Testing** - Unit tests, E2E tests
5. **Deployment** - CI/CD, production deployment

---

**Phase 3 Step 1: Core Pages** ✅  
**Phase 3 Step 2: Dashboard & Upload** ✅  
**Phase 3 Step 3: Reports & Analytics** ✅  
**Next:** Phase 4 - Agentic AI Engine Integration
