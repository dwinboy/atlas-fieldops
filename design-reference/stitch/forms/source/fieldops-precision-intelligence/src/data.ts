import { Form, AuditLog, Submission } from './types';

export const INITIAL_FORMS: Form[] = [
  {
    id: 'form-agri-1',
    name: 'Agriculture Baseline 2024',
    sector: 'AGRI',
    version: 'v2.4.1',
    createdDate: 'Oct 12, 2023',
    submissionsCount: 14208,
    trend: [40, 60, 55, 80, 95, 70, 85],
    status: 'Published',
    verified: true,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-R80x3D8hIkn-e2LorTKk7kXMWQZRQh71uu_HstXPz4MAL1h3d9VoxXzSepjPAbmH8ZuGAak1_PaLdLqOmUnLpbsDDo5bvXFGqV2ApfahhrYwUUaZ_4UOMutRp8PQtnvkLrQWRoCI0Ac_uFM-W2YsyV-9SrNlTcXRJKjlQD5Kt7NK2vU4vdv7TgMvAndkn__kSZqp_fycMvIQRD3sLtjsijPvEsV7e4gr2x4UxMZUvZTc6rmENhYc7PBmSaG-oSFhUjY_hp1qFg',
    fields: [
      {
        id: 'ag-f1',
        type: 'text',
        label: 'Field Representative Name',
        placeholder: 'Enter full name',
        required: true
      },
      {
        id: 'ag-f2',
        type: 'select',
        label: 'Crop Culture Category',
        required: true,
        options: ['Maize', 'Soybeans', 'Winter Wheat', 'Canola', 'Sorghum']
      },
      {
        id: 'ag-f3',
        type: 'number',
        label: 'Soil pH Measurement',
        placeholder: 'e.g., 6.5',
        required: true
      },
      {
        id: 'ag-f4',
        type: 'number',
        label: 'Ambient Temperature (°C)',
        placeholder: 'e.g., 24.2',
        required: false
      },
      {
        id: 'ag-f5',
        type: 'checkbox',
        label: 'Visible Pest Damage Detected',
        required: false
      },
      {
        id: 'ag-f6',
        type: 'textarea',
        label: 'Soil Nutrients and Irrigation Notes',
        placeholder: 'Add any field observations here...',
        required: false
      }
    ]
  },
  {
    id: 'form-health-2',
    name: 'Health Outreach Survey',
    sector: 'HEALTH',
    version: 'v1.0.8',
    createdDate: 'Jan 04, 2024',
    submissionsCount: 3492,
    trend: [20, 30, 45, 40, 55, 65, 80],
    status: 'Published',
    verified: true,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdoEcbu9fSx2sXG0w7NcPGtJwfEJBoOLp-Wg2Rw1uo8lbM-Hoet3m30Y-qc05obonGXK07y50dFVLJBGaEeN2SlAGohzin7ewQs-TmPhxwfoUDJhxkTGdjKIDoEOTxL0P5C-8io086SlxAEXdiyKKTTlCC2l12kM_UiQZrQmPb7UbPPqml6y6mdn50BVrcgITkUnbleH720XOz3GAolvKR7SbD1SE2OyBEuffr6N_OJqsnNCMNqZEq8IsR8qqLbRGQcx2azfJs7Q',
    fields: [
      {
        id: 'he-f1',
        type: 'text',
        label: 'Patient ID Number',
        placeholder: 'e.g., PAT-8830-X',
        required: true
      },
      {
        id: 'he-f2',
        type: 'number',
        label: 'Patient Age',
        placeholder: 'Years',
        required: true
      },
      {
        id: 'he-f3',
        type: 'select',
        label: 'Primary Symptom / Complaint',
        required: true,
        options: ['Respiratory distress', 'Acute fever', 'Gastrointestinal distress', 'Routine checkup', 'Other']
      },
      {
        id: 'he-f4',
        type: 'number',
        label: 'Systolic Blood Pressure (mmHg)',
        placeholder: 'e.g., 120',
        required: false
      },
      {
        id: 'he-f5',
        type: 'checkbox',
        label: 'Received Seasonal Immunizations',
        required: false
      },
      {
        id: 'he-f6',
        type: 'textarea',
        label: 'Clinical Assessment Notes',
        placeholder: 'Provide recommendations or follow-up timelines...',
        required: false
      }
    ]
  },
  {
    id: 'form-retail-3',
    name: 'Retail Inventory Audit',
    sector: 'RETAIL',
    version: 'v3.2.0',
    createdDate: 'Feb 18, 2024',
    submissionsCount: 22810,
    trend: [90, 85, 70, 75, 60, 65, 50],
    status: 'Published',
    verified: false,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2VrL1xLQAVTJW7UcyEBfXPS_XjqN8cbhQ0axqSZ8pde4aMkzaCZB54nlHo9W2lsaP3z8Kw20O9iVzKXXzX0pPc979udPn0XuC_37ehBfApg3UgzazcfBTlUcmap0A4Q6aNF2yHJ-eKJCguOB9EwkGGm9fWm2PfFUcq1FsYs_WcHwsO_sxHS9MkLM3L5PS1h9mfLTWZQ3-dGyfjSFtsPwMIuCGFO5gxxi9OfJx2JQlBb_waV4IP4FjqAdoYQr3vU4o78EYj6ynLg',
    fields: [
      {
        id: 're-f1',
        type: 'text',
        label: 'Store Code Indicator',
        placeholder: 'e.g., ST-MIDWEST-094',
        required: true
      },
      {
        id: 're-f2',
        type: 'select',
        label: 'Audited Inventory Department',
        required: true,
        options: ['Electronics', 'Dry Grocery', 'Apparel & Footwear', 'Home Goods', 'Pharmaceuticals']
      },
      {
        id: 're-f3',
        type: 'number',
        label: 'Discrepancy Stock Count',
        placeholder: 'Count of missing/extra items',
        required: true
      },
      {
        id: 're-f4',
        type: 'checkbox',
        label: 'Requires Immediate Re-order',
        required: false
      },
      {
        id: 're-f5',
        type: 'textarea',
        label: 'Action Plan Summary',
        placeholder: 'Explain why the inventory discrepancy occurred...',
        required: false
      }
    ]
  },
  {
    id: 'form-logistics-4',
    name: 'Logistics Proof of Delivery',
    sector: 'LOGISTICS',
    version: 'v1.4.2',
    createdDate: 'Mar 01, 2024',
    submissionsCount: 58112,
    trend: [50, 60, 70, 80, 90, 100, 95],
    status: 'Published',
    verified: true,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtaV3wK6Gt436bYTUd0YqPs12jGku1dsw0pMUd211uiun8X-7yoCRUxFt-gmGCLe7SspxD9kwKCQ4LSod7XqNZPEk3QBA_9Zf94OJvT09G2aPYD4hgq_FFqdWAynWpURdxYW36zT0yzLSGubTdjWPAfBhlq1kCylv2swV6XDFQ_PSi41IXnabDn0oNmnRYGv4um2bQ6upzZYP2T6wS8twtmbZ1Ie5QDOUXZ8RwGNUDZlsvHCPtrQieCniztdY0fMWdCChnJDcbUQ',
    fields: [
      {
        id: 'lo-f1',
        type: 'text',
        label: 'Waybill Tracking Number',
        placeholder: 'e.g., WB-992384-N',
        required: true
      },
      {
        id: 'lo-f2',
        type: 'text',
        label: 'Consignee / Recipient Name',
        placeholder: 'Who accepted the shipment',
        required: true
      },
      {
        id: 'lo-f3',
        type: 'number',
        label: 'Consignment Mass (kg)',
        placeholder: 'e.g., 14.5',
        required: true
      },
      {
        id: 'lo-f4',
        type: 'select',
        label: 'Transit Delivery Status',
        required: true,
        options: ['Delivered - On Time', 'Delivered - Damaged Packaging', 'Delivered - Delayed Transit', 'Partial Delivery']
      },
      {
        id: 'lo-f5',
        type: 'checkbox',
        label: 'Biometric/Signature Waiver Form Signed',
        required: false
      }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    type: 'publish',
    title: 'Form published: Retail Inventory Audit',
    description: 'v3.2.0 • 2 minutes ago',
    timestamp: '2 mins ago',
    status: 'success'
  },
  {
    id: 'log-2',
    type: 'review',
    title: 'Review completed by S. Miller',
    description: 'Logistics v1.4.2 • 1 hour ago',
    timestamp: '1 hour ago',
    status: 'info'
  },
  {
    id: 'log-3',
    type: 'sync_fail',
    title: 'Failed sync attempt detected',
    description: 'Regional Node 04 • 3 hours ago',
    timestamp: '3 hours ago',
    status: 'error'
  },
  {
    id: 'log-4',
    type: 'submission',
    title: 'New submission: Agriculture Baseline 2024',
    description: 'Field Officer J. Doe • 4 hours ago',
    timestamp: '4 hours ago',
    status: 'success'
  }
];

export const SAMPLE_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-1',
    formId: 'form-agri-1',
    formName: 'Agriculture Baseline 2024',
    submittedAt: '2026-06-30T04:50:00Z',
    submittedBy: 'Agent Joseph Vance',
    data: {
      'ag-f1': 'Agent Joseph Vance',
      'ag-f2': 'Winter Wheat',
      'ag-f3': 6.8,
      'ag-f4': 22.5,
      'ag-f5': false,
      'ag-f6': 'Moisture levels optimal, trace nitrogen deficit observed.'
    },
    gps: { lat: 38.8951, lng: -77.0364, locationName: 'North Plot (Sector 12)' },
    biometricHash: 'sha256:7b5d3a9f0e1c2d3b4a5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
    deviceFingerprint: 'rugged-pad-v2-sn4930'
  },
  {
    id: 'sub-2',
    formId: 'form-health-2',
    formName: 'Health Outreach Survey',
    submittedAt: '2026-06-30T06:12:00Z',
    submittedBy: 'Dr. Sarah Miller',
    data: {
      'he-f1': 'PAT-9481-B',
      'he-f2': 45,
      'he-f3': 'Acute fever',
      'he-f4': 135,
      'he-f5': true,
      'he-f6': 'Prescribed basic antipyretics and ordered hydration. Instructed to visit city clinic if symptoms persist.'
    },
    gps: { lat: -1.2921, lng: 36.8219, locationName: 'Kibera Outpost Hub' },
    biometricHash: 'sha256:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    deviceFingerprint: 'health-tablet-sn901'
  }
];

export const FIELD_AGENTS = [
  'Joseph Vance',
  'Dr. Sarah Miller',
  'Marcus Vance',
  'Elena Rostova',
  'Kenji Sato',
  'Fatima Al-Sayed',
  'Chloe Dupoint',
  'Amara Diallo'
];

export const LOCATION_PRESETS = [
  { lat: 34.0522, lng: -118.2437, locationName: 'Western Sector Range' },
  { lat: 40.7128, lng: -74.0060, locationName: 'Northeastern Regional Base' },
  { lat: 35.6762, lng: 139.6503, locationName: 'Pacific Rim District' },
  { lat: -33.8688, lng: 151.2093, locationName: 'Southern Ocean Hub' },
  { lat: 51.5074, lng: -0.1278, locationName: 'Euro-Zone Quad 4' },
  { lat: 1.3521, lng: 103.8198, locationName: 'Southeast Asia Port Range' }
];

export function generateBiometricHash(): string {
  const characters = 'abcdef0123456789';
  let result = 'sha256:';
  for (let i = 0; i < 64; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
