# API Operational Index

Generated on: 2026-02-08

| Method | Path | Summary | Tags |
| --- | --- | --- | --- |
| GET | `/openapi.json` | OpenAPI Schema | - |
| GET | `/docs` | API Documentation | - |
| GET | `/redoc` | ReDoc Documentation | - |
| GET | `/api/health` | Health Check | Health |
| GET | `/api/ping` | Ping | Health |
| GET | `/api/health/ready` | Readiness Check | Health |
| GET | `/api/health/live` | Liveness Check | Health |
| GET | `/api/health/metrics` | Metrics | Health |
| GET | `/api/common/check-duplicate` | Check Duplicate | Common |
| GET | `/api/dashboard/summary` | Dashboard Summary | Dashboard |
| GET | `/api/dashboard/activity` | Recent Activity | Dashboard |
| GET | `/api/dashboard/insights` | Dashboard Insights | Dashboard |
| GET | `/api/po/stats/` | PO Statistics | Purchase Orders |
| GET | `/api/po/` | List Purchase Orders | Purchase Orders |
| GET | `/api/po/{po_number:path}/context/` | PO Context | Purchase Orders |
| GET | `/api/po/{po_number:path}/dc/` | PO Delivery Challans | Purchase Orders |
| GET | `/api/po/{po_number:path}/excel/` | Export PO Excel | Purchase Orders |
| GET | `/api/po/{po_number:path}/` | Get PO Details | Purchase Orders |
| POST | `/api/po/` | Create Purchase Order | Purchase Orders |
| PUT | `/api/po/{po_number:path}/` | Update PO | Purchase Orders |
| POST | `/api/po/upload/` | Upload PO HTML | Purchase Orders |
| POST | `/api/po/upload/batch/` | Batch Upload POs | Purchase Orders |
| GET | `/api/dc/po/{po_number:path}/dispatchable-items/` | Dispatchable Items | Delivery Challans |
| GET | `/api/dc/stats/` | DC Statistics | Delivery Challans |
| GET | `/api/dc/` | List Delivery Challans | Delivery Challans |
| GET | `/api/dc/export-list/` | Export DC List | Delivery Challans |
| GET | `/api/dc/{dc_number:path}/invoice/` | DC Invoice Preview | Delivery Challans |
| GET | `/api/dc/{dc_number:path}/download-gc/` | Download GC | Delivery Challans |
| GET | `/api/dc/{dc_number:path}/download/` | Download DC | Delivery Challans |
| GET | `/api/dc/{dc_number:path}/` | Get DC Details | Delivery Challans |
| POST | `/api/dc/` | Create Delivery Challan | Delivery Challans |
| PUT | `/api/dc/{dc_number:path}/` | Update DC | Delivery Challans |
| PUT | `/api/dc/{dc_number:path}/metadata/` | Update DC Metadata | Delivery Challans |
| DELETE | `/api/dc/{dc_number:path}/` | Delete DC | Delivery Challans |
| GET | `/api/invoice/stats/` | Invoice Statistics | Invoices |
| GET | `/api/invoice/` | List Invoices | Invoices |
| GET | `/api/invoice/export-list/` | Export Invoice List | Invoices |
| GET | `/api/invoice/{invoice_number:path}/download/` | Download Invoice | Invoices |
| GET | `/api/invoice/preview/{dc_number:path}/` | Invoice Preview | Invoices |
| GET | `/api/invoice/{invoice_number:path}/` | Get Invoice Details | Invoices |
| POST | `/api/invoice/` | Create Invoice | Invoices |
| PUT | `/api/invoice/{invoice_number:path}/` | Update Invoice | Invoices |
| DELETE | `/api/invoice/{invoice_number:path}/` | Delete Invoice | Invoices |
| POST | `/api/srv/upload/batch/` | Batch Upload SRVs | SRVs |
| GET | `/api/srv/` | List SRVs | SRVs |
| GET | `/api/srv/po/{po_number:path}/srvs/` | PO SRVs | SRVs |
| GET | `/api/srv/stats/` | SRV Statistics | SRVs |
| GET | `/api/srv/{srv_number:path}/` | Get SRV Details | SRVs |
| DELETE | `/api/srv/{srv_number:path}/` | Delete SRV | SRVs |
| GET | `/api/reports/reconciliation` | Reconciliation Report | Reports |
| GET | `/api/reports/register/dc` | DC Register | Reports |
| GET | `/api/reports/register/invoice` | Invoice Register | Reports |
| GET | `/api/reports/register/po` | PO Register | Reports |
| GET | `/api/reports/pending` | Pending Items | Reports |
| POST | `/api/reports/export-selected` | Export Selected | Reports |
| GET | `/api/reports/kpis` | KPI Report | Reports |
| GET | `/api/reports/daily-dispatch` | Daily Dispatch | Reports |
| GET | `/api/reports/guarantee-certificate` | Guarantee Certificate | Reports |
| GET | `/api/settings/download-folders` | Get Download Folders | Settings |
| POST | `/api/settings/download-folders` | Update Download Folders | Settings |
| GET | `/api/settings/` | Get Settings | Settings |
| GET | `/api/settings/full` | Get All Settings | Settings |
| POST | `/api/settings/` | Update Setting | Settings |
| POST | `/api/settings/batch` | Batch Update Settings | Settings |
| GET | `/api/buyers/` | List Buyers | Buyers |
| POST | `/api/buyers/` | Create Buyer | Buyers |
| PUT | `/api/buyers/{id}` | Update Buyer | Buyers |
| PUT | `/api/buyers/{id}/default` | Set Default Buyer | Buyers |
| DELETE | `/api/buyers/{id}` | Delete Buyer | Buyers |
| GET | `/api/search/` | Search | Search |
| GET | `/api/deviations/` | List Deviations | Deviations |
| POST | `/api/deviations/{deviation_id}/resolve` | Resolve Deviation | Deviations |
| GET | `/api/deviations/stats` | Deviation Stats | Deviations |
| POST | `/api/system/reset-db` | Reset Database | System |
| POST | `/api/system/reconcile-all` | Reconcile All POs | System |
| GET | `/api/intelligence/recovery-notifications` | Recovery Notifications | Intelligence |
| GET | `/api/intelligence/logs` | Intelligence Logs | Intelligence |
| GET | `/api/intelligence/forensics/{entity_id}` | Entity Forensics | Intelligence |
| GET | `/api/intelligence/errors` | System Errors | Intelligence |
| GET | `/api/intelligence/decisions` | AI Decisions | Intelligence |
| GET | `/api/intelligence/health` | System Health | Intelligence |
