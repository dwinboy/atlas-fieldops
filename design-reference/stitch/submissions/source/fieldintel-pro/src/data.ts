import { SubmissionRecord } from './types';

export const INITIAL_RECORDS: SubmissionRecord[] = [
  {
    id: '#FO-8921',
    entityName: 'Green Valley Clinic',
    subTitle: 'Health Cluster B',
    sector: 'HEALTH',
    fieldOfficer: {
      name: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 24, 09:12 AM',
    timestamp: new Date('2026-10-24T09:12:00').getTime(),
    status: 'In Review',
    urgency: 'URGENT',
    gps: {
      latitude: 9.0820,
      longitude: 8.6753,
      displayString: '9.0820° N, 8.6753° E'
    },
    entityImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDW3brFJefU_lW1xEU_yzYx0nLA-GEvGewwwvshSzsLh8WAl49JaCKG569LQkwadMmgyz6IduICODOkTTJjWB5Z1ycvcWo-5uJYLlKkaZNa-GcGWJVTlCnQ5fIHbDzTToINVorJhZE2Q_ApQU4yOqAylJmrYzGpGEW7I7emVJkLKRTvq4e6tGHE-AwWjxXjwXSnfb-x3n4FU4pbbo8xULKjuX7XYawD2bDbbBmseBJLBnN231nB0euzNlLcedHaLvGf7x3Qfl2ZXw',
    mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlwnGJ9rJ90gwMnmREZ-au0szt78H9JpZgeobLkKfMQdthHIjRcE9kCpPGgj6VPQ3oRc5jyNUb9TBWUUczzEP4euS7NFbufKdS2RELNRJERw-6rJfIh19ajpyYxcGApOPCKNs1jYAl_ovEgI7zOAgIbspU2V3RfdIF3qg7g5xdXIJjdum5LKZRj-gs9FdwcBQjVClTdgkVtjqszoJLJyNUQd_LSW2gphGqzY47UQ3f9U5u5JHfW1Zp0y4k3vD6QJOE_M--q1lXew',
    formIntelligence: {
      supplyLevel: '88% Capacity',
      lastAudit: '12 Days Ago',
      additionalMetrics: [
        { label: 'Staff Present', value: '4/5 Active' },
        { label: 'Cold Chain OK', value: 'Yes' }
      ]
    },
    officerNotes: 'Primary storage unit showing signs of temperature fluctuation. Vaccine stocks are currently stable but require immediate HVAC inspection.',
    fieldEvidence: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAPLykQpkraTxcbE25N4hHXbsbPKcOkrL0DBMPGdme3exhWy4OCXFswVrCLTeAO65Vf69nniq6fDkrVLmV8iT7qJQmB59MxeLBl4FNnujknOPjBvjOMYFadCmf-d6eqMVUicRieJFI86IhmBm7GtJKur7-yC_Re-E5MarZ02p-PTW0YZjsxpGYStwCJu_u2RPbekNlGKkqvoapp46uMRPTLhYMFGiZQcnMSH7OloRlthYxj6DLya3Pqm8L_BB7Qu7sk88J5dYFQVg',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB_Pdhl0hw2TUgIrGFHaBFTlaYe-QAXDT1sKd0QePPkWah0n6sQnCbzS3luYsu957I-yVXx8Rr0MHhW7ZIjhpQ7fMDeNaq56WpxXsIf6dsyDIEhZxno3GMYpz72ziKnWoeQ4TPbXMQ8Wv-Om1WsN4q9YQxmZko2Y7lQxXtb6RBpRnV4fbuT27XoRlVL6R5uW8Wz2wQBRASotos29l_YzNrQRd0fszScm2cT64zFO2NdAQqV2ZY8vQqjMbQmLsz6Ez1A83tMruc78Q'
    ]
  },
  {
    id: '#FO-8920',
    entityName: 'Abuja Maize Co-op',
    subTitle: 'Regional HQ',
    sector: 'AGRI',
    fieldOfficer: {
      name: 'David Okafor',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 23, 11:45 PM',
    timestamp: new Date('2026-10-23T23:45:00').getTime(),
    status: 'Pending',
    urgency: 'NORMAL',
    gps: {
      latitude: 9.0765,
      longitude: 7.3986,
      displayString: '9.0765° N, 7.3986° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '94% Stock',
      lastAudit: '5 Days Ago',
      additionalMetrics: [
        { label: 'Storage Humidity', value: '14.2%' },
        { label: 'Pest Control', value: 'Certified' }
      ]
    },
    officerNotes: 'Maize storage warehouses checked for humidity. Average humidity sits at 14.2%, which is within acceptable thresholds but requires ventilation checks next week.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8919',
    entityName: 'Solar Bridge North',
    subTitle: 'Site Inspection',
    sector: 'INFRA',
    fieldOfficer: {
      name: 'Marcus Thorne',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 23, 04:20 PM',
    timestamp: new Date('2026-10-23T16:20:00').getTime(),
    status: 'Approved',
    urgency: 'NORMAL',
    gps: {
      latitude: 10.4284,
      longitude: 7.4219,
      displayString: '10.4284° N, 7.4219° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '100% Operational',
      lastAudit: '30 Days Ago',
      additionalMetrics: [
        { label: 'Daily Output', value: '1.2 MWh' },
        { label: 'Grid Connected', value: 'Yes' }
      ]
    },
    officerNotes: 'All solar arrays are fully operational and connected to the local mini-grid. Inverter readings match performance estimates. Structurally sound.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1548613053-220bfb8e662f?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8918',
    entityName: 'Lagos Primary Sch',
    subTitle: 'Education Wing',
    sector: 'HEALTH',
    fieldOfficer: {
      name: 'Elena Rodriguez',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 23, 01:05 PM',
    timestamp: new Date('2026-10-23T13:05:00').getTime(),
    status: 'Returned',
    urgency: 'NORMAL',
    gps: {
      latitude: 6.5244,
      longitude: 3.3792,
      displayString: '6.5244° N, 3.3792° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '40% Water',
      lastAudit: '12 Days Ago',
      additionalMetrics: [
        { label: 'Pump Status', value: 'Damaged' },
        { label: 'Attendance', value: '240 Students' }
      ]
    },
    officerNotes: 'Sanitation facilities audit failed. Water pump requires diaphragm replacement. Re-inspection requested once plumbing repairs are completed.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1541560052-5e137f229371?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8917',
    entityName: 'Borehole Audit #4',
    subTitle: 'Water Dept',
    sector: 'INFRA',
    fieldOfficer: {
      name: 'David Okafor',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 23, 10:15 AM',
    timestamp: new Date('2026-10-23T10:15:00').getTime(),
    status: 'Approved',
    urgency: 'NORMAL',
    gps: {
      latitude: 7.3775,
      longitude: 3.9470,
      displayString: '7.3775° N, 3.9470° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1541944743827-e04aa6427c33?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1506506492368-a15e72419854?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '100% Flow',
      lastAudit: '1 Day Ago',
      additionalMetrics: [
        { label: 'Flow Rate', value: '25 L/min' },
        { label: 'Depth', value: '45 meters' }
      ]
    },
    officerNotes: 'Borehole clean water flow rate verified at 25 liters per minute. Local water committee formed and trained in preventative maintenance.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1527489377706-5bf97e608852?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8916',
    entityName: 'Kano Granary Silos',
    subTitle: 'Zone 4 Storage',
    sector: 'AGRI',
    fieldOfficer: {
      name: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 22, 03:30 PM',
    timestamp: new Date('2026-10-22T15:30:00').getTime(),
    status: 'In Review',
    urgency: 'NORMAL',
    gps: {
      latitude: 12.0022,
      longitude: 8.5920,
      displayString: '12.0022° N, 8.5920° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1594142103914-7f12e0ff3059?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '72% Capacity',
      lastAudit: '8 Days Ago',
      additionalMetrics: [
        { label: 'Stored Grain', value: 'Sorghum' },
        { label: 'Temp', value: '28°C' }
      ]
    },
    officerNotes: 'Silo structure sound. Checked for moisture and ventilation leaks. Minor crack spotted in Silo 2 discharge chute, scheduled maintenance for next month.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8915',
    entityName: 'Ibadan General Hosp',
    subTitle: 'Outpost Ward',
    sector: 'HEALTH',
    fieldOfficer: {
      name: 'Elena Rodriguez',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 22, 11:15 AM',
    timestamp: new Date('2026-10-22T11:15:00').getTime(),
    status: 'Approved',
    urgency: 'URGENT',
    gps: {
      latitude: 7.3775,
      longitude: 3.9470,
      displayString: '7.3775° N, 3.9470° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1506506492368-a15e72419854?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '95% Staffed',
      lastAudit: '3 Days Ago',
      additionalMetrics: [
        { label: 'Oxygen Tanks', value: '18 Available' },
        { label: 'ER Load', value: 'Moderate' }
      ]
    },
    officerNotes: 'Outpost emergency oxygen system checked. Pressure is fully stabilized and auto-switch gears operate smoothly. Emergency power backup test succeeded.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8914',
    entityName: 'Kaduna Rail Bridge',
    subTitle: 'Pier 3 Overpass',
    sector: 'INFRA',
    fieldOfficer: {
      name: 'Marcus Thorne',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 21, 04:50 PM',
    timestamp: new Date('2026-10-21T16:50:00').getTime(),
    status: 'Returned',
    urgency: 'URGENT',
    gps: {
      latitude: 10.5105,
      longitude: 7.4165,
      displayString: '10.5105° N, 7.4165° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '65% Complete',
      lastAudit: '15 Days Ago',
      additionalMetrics: [
        { label: 'Defect Code', value: 'STR-409' },
        { label: 'Siltation Risk', value: 'High' }
      ]
    },
    officerNotes: 'Concrete stress fractures observed on Pier 3. Local soil shifting under current rainy conditions requires urgent civil engineering intervention.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8913',
    entityName: 'Zaria Irrigation Grid',
    subTitle: 'North Channel',
    sector: 'AGRI',
    fieldOfficer: {
      name: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 21, 11:20 AM',
    timestamp: new Date('2026-10-21T11:20:00').getTime(),
    status: 'Approved',
    urgency: 'NORMAL',
    gps: {
      latitude: 11.0855,
      longitude: 7.7188,
      displayString: '11.0855° N, 7.7188° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '90% Flow',
      lastAudit: '7 Days Ago',
      additionalMetrics: [
        { label: 'Acreage Covered', value: '450 Acres' },
        { label: 'Silt Build-up', value: 'Minimal' }
      ]
    },
    officerNotes: 'North distribution channel fully cleared of debris. Sluice gate mechanisms lubricated and operating under automated telemetry schedules perfectly.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1563514223727-6fc964d3df6a?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8912',
    entityName: 'Enugu Power Station',
    subTitle: 'Substation Alpha',
    sector: 'INFRA',
    fieldOfficer: {
      name: 'Marcus Thorne',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 20, 05:40 PM',
    timestamp: new Date('2026-10-20T17:40:00').getTime(),
    status: 'Pending',
    urgency: 'NORMAL',
    gps: {
      latitude: 6.4281,
      longitude: 7.5019,
      displayString: '6.4281° N, 7.5019° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '80% Power',
      lastAudit: '14 Days Ago',
      additionalMetrics: [
        { label: 'Core Temp', value: '62°C' },
        { label: 'Cooling Fans', value: '4/4 Active' }
      ]
    },
    officerNotes: 'Transformer cooling system tested during peak load. Operating temperatures stabilized within safety bands. Minor coolant top-off recommended.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8911',
    entityName: 'Port Harcourt Dock',
    subTitle: 'Container Cargo B',
    sector: 'INFRA',
    fieldOfficer: {
      name: 'Elena Rodriguez',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 20, 02:15 PM',
    timestamp: new Date('2026-10-20T14:15:00').getTime(),
    status: 'Approved',
    urgency: 'NORMAL',
    gps: {
      latitude: 4.7758,
      longitude: 7.0094,
      displayString: '4.7758° N, 7.0094° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '98% Cargo Ok',
      lastAudit: '2 Days Ago',
      additionalMetrics: [
        { label: 'Containers', value: '320 Audited' },
        { label: 'Seal Breach', value: 'None' }
      ]
    },
    officerNotes: 'Security seal audits carried out for Cargo Area B. No discrepancies or breached seals found. Shipping containers verified against manifests.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&q=80&w=300'
    ]
  },
  {
    id: '#FO-8910',
    entityName: 'Calabar Cocoa Co-op',
    subTitle: 'Processing Unit 1',
    sector: 'AGRI',
    fieldOfficer: {
      name: 'David Okafor',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'
    },
    dateSubmitted: 'Oct 19, 09:40 AM',
    timestamp: new Date('2026-10-19T09:40:00').getTime(),
    status: 'Returned',
    urgency: 'NORMAL',
    gps: {
      latitude: 4.9757,
      longitude: 8.3417,
      displayString: '4.9757° N, 8.3417° E'
    },
    entityImage: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&q=80&w=300',
    mapImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400',
    formIntelligence: {
      supplyLevel: '50% Dry',
      lastAudit: '10 Days Ago',
      additionalMetrics: [
        { label: 'Bean Moisture', value: '18.5% (High)' },
        { label: 'Roaster Status', value: 'Standby' }
      ]
    },
    officerNotes: 'Moisture content of raw cocoa beans too high (18.5%). Cocoa beans need another 48 hours of sun drying on raised platforms to hit the 7.5% safety target.',
    fieldEvidence: [
      'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=300'
    ]
  }
];
