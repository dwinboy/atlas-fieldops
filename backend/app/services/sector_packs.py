from copy import deepcopy
from typing import Any


SectorPack = dict[str, Any]
SectorQuestion = dict[str, Any]


SECTOR_PACKS: dict[str, SectorPack] = {
    "agriculture": {
        "id": "agriculture",
        "name": "Agriculture and Farmer Programs",
        "sector": "Agriculture",
        "description": "For farmer registration, extension visits, input distribution, yield monitoring, cooperatives, and seasonal agriculture programs.",
        "terminology": {
            "primary_entity": "Farmer",
            "secondary_entities": "Household, Farm, Cooperative",
            "field_visit": "Extension visit",
            "submission": "Farm record",
        },
        "entity_types": ["Farmer", "Household", "Farm", "Cooperative", "Village"],
        "form_templates": ["Farmer Registration", "Baseline Farm Survey", "Input Distribution", "Seasonal Yield Monitoring", "Training Attendance", "Endline Survey"],
        "indicator_templates": ["Farmers registered", "Farmers trained", "Improved seed adoption rate", "Average yield per hectare", "Input package received", "Households with increased income"],
        "dashboard_widgets": ["Farmer coverage", "Yield progress", "Input distribution", "Training completion", "GPS farm coverage"],
        "report_templates": ["Monthly extension report", "Seasonal yield report", "Input distribution report", "Donor results report"],
        "validation_rules": ["Farm size cannot be negative", "Harvest date cannot be in the future", "Yield must match crop and season", "Phone or farmer ID required for registration"],
        "data_quality_rules": ["Duplicate farmer by phone or name + village", "Static GPS across many farmers", "Suspiciously short farm interviews", "Yield outliers by crop"],
        "workflows": ["Registration → Baseline → Monitoring → Endline", "Training attendance → Follow-up visit", "Input distribution → Usage verification"],
        "mobile_guidance": ["Require GPS at farm or household", "Allow offline collection", "Prefill assigned farmers", "Warn when outside assigned village"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Data Manager Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent required before collecting farmer or household profile data",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Farmer",
                "secondaryEntityTypes": ["Household", "Farm", "Cooperative"],
                "codeFormat": "FRM-YYYY-000001",
                "duplicateFields": ["Phone", "National ID", "Household ID", "Name + Village", "GPS"],
                "profileUpdateRule": "Require review for name, phone, village, and GPS changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Farmer Registration → Baseline Farm Survey → Seasonal Monitoring → Endline Survey",
                "prerequisites": "Registration should be approved before baseline. Baseline should be completed before monitoring visits.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Seasonal",
                "dataSource": "Approved farmer registration, training, distribution, and yield monitoring forms",
                "disaggregation": ["Sex", "Age", "Village", "Crop", "Farm size"],
            },
        },
    },
    "health": {
        "id": "health",
        "name": "Health and Community Systems",
        "sector": "Health",
        "description": "For community health work, facility assessments, referrals, service follow-up, health campaigns, and sensitive health data collection.",
        "terminology": {
            "primary_entity": "Patient or Client",
            "secondary_entities": "Household, Facility, Health Worker",
            "field_visit": "Health visit",
            "submission": "Health record",
        },
        "entity_types": ["Patient", "Client", "Household", "Facility", "Health Worker", "Community"],
        "form_templates": ["Client Intake", "Facility Assessment", "Referral Follow-up", "Community Health Visit", "Service Satisfaction", "Campaign Attendance"],
        "indicator_templates": ["Clients reached", "Referral completion rate", "Facilities assessed", "Service uptake", "Follow-up completed on time", "Stock-out rate"],
        "dashboard_widgets": ["Referral follow-up", "Facility coverage", "Sensitive data quality", "Visit timeliness", "Service uptake"],
        "report_templates": ["Monthly health outreach report", "Facility assessment report", "Referral tracking report", "Donor health indicator report"],
        "validation_rules": ["Date of birth cannot be in the future", "Age must match date of birth", "Consent required for PII", "Referral deadline must be after visit date"],
        "data_quality_rules": ["Duplicate client by phone or ID", "Missing consent", "Invalid age/date", "Sensitive data export risk"],
        "workflows": ["Client Intake → Service Visit → Referral Follow-up", "Facility Assessment → Improvement Action → Verification"],
        "mobile_guidance": ["Mask sensitive fields", "Require consent before submission", "Support offline visits", "Warn for expired referral follow-up"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Data Manager Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent and sensitive data protection required for health records",
            "sensitiveDataControls": "Mask sensitive health and identity fields for viewer roles",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Beneficiary",
                "secondaryEntityTypes": ["Household", "Facility", "Health Worker"],
                "codeFormat": "HLT-YYYY-000001",
                "duplicateFields": ["Phone", "National ID", "Name + Date of Birth", "Name + Village"],
                "profileUpdateRule": "Require review for name, phone, village, and GPS changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Client Intake → Health Visit → Referral Follow-up",
                "prerequisites": "Consent must be captured before sensitive health data is submitted.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Monthly",
                "dataSource": "Approved intake, facility, referral, and visit forms",
                "disaggregation": ["Sex", "Age", "Location", "Disability status", "Service type"],
            },
        },
    },
    "education": {
        "id": "education",
        "name": "Education and School Monitoring",
        "sector": "Education",
        "description": "For school profiles, attendance monitoring, teacher support, learning assessments, classroom observations, and education access programs.",
        "terminology": {
            "primary_entity": "School or Student",
            "secondary_entities": "Teacher, Classroom, Household",
            "field_visit": "School monitoring visit",
            "submission": "Education record",
        },
        "entity_types": ["School", "Student", "Teacher", "Classroom", "Household"],
        "form_templates": ["School Registration", "Attendance Monitoring", "Teacher Observation", "Learning Assessment", "School Facility Assessment", "Distribution Attendance"],
        "indicator_templates": ["Schools monitored", "Attendance rate", "Students assessed", "Teacher observation score", "Learning outcome improvement", "Materials distributed"],
        "dashboard_widgets": ["School coverage", "Attendance trend", "Learning outcomes", "Teacher support", "Facility gaps"],
        "report_templates": ["Monthly school monitoring report", "Learning assessment report", "Attendance report", "Education donor results report"],
        "validation_rules": ["Attendance cannot exceed enrollment", "Assessment date cannot be in the future", "Grade level required", "School code required"],
        "data_quality_rules": ["Duplicate school by code or name + district", "Attendance outliers", "Missing location", "Repeated identical classroom observations"],
        "workflows": ["School Registration → Baseline Assessment → Attendance Monitoring → Endline Assessment", "Teacher Observation → Coaching Follow-up"],
        "mobile_guidance": ["Prefill schools assigned to officers", "Require GPS at school", "Work offline during rural visits", "Track assessment completion"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Under Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent required for identifiable student-level data",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "School",
                "secondaryEntityTypes": ["Student", "Teacher", "Classroom"],
                "codeFormat": "SCH-YYYY-000001",
                "duplicateFields": ["Name + Village", "GPS"],
                "profileUpdateRule": "Require review for name, phone, village, and GPS changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "School Registration → Baseline Assessment → Attendance Monitoring → Endline Assessment",
                "prerequisites": "School profile should be approved before attendance and learning assessments are counted.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Monthly",
                "dataSource": "Approved school, attendance, assessment, and teacher observation forms",
                "disaggregation": ["Sex", "Age", "Grade", "School", "District"],
            },
        },
    },
    "wash": {
        "id": "wash",
        "name": "WASH and Infrastructure Monitoring",
        "sector": "WASH",
        "description": "For water points, sanitation facilities, hygiene promotion, infrastructure verification, service quality, and community monitoring.",
        "terminology": {
            "primary_entity": "Water Point or Household",
            "secondary_entities": "Community, Facility, School",
            "field_visit": "WASH verification visit",
            "submission": "WASH record",
        },
        "entity_types": ["Household", "Water Point", "Facility", "School", "Community", "Village"],
        "form_templates": ["Household WASH Survey", "Water Point Assessment", "Hygiene Session Attendance", "Infrastructure Verification", "Sanitation Monitoring"],
        "indicator_templates": ["Households with safe water access", "Functional water points", "Sanitation facility coverage", "People reached with hygiene promotion", "Water quality pass rate"],
        "dashboard_widgets": ["Water point functionality", "Household coverage", "Infrastructure verification", "GPS coverage", "Quality alerts"],
        "report_templates": ["WASH monthly report", "Water point status report", "Infrastructure verification report", "Donor WASH indicator report"],
        "validation_rules": ["GPS required for infrastructure", "Water point status required", "Household size must be realistic", "Collection date cannot be in the future"],
        "data_quality_rules": ["Duplicate water point by GPS proximity", "Missing GPS", "Inconsistent functionality status", "Repeated household records"],
        "workflows": ["Water Point Registration → Functionality Monitoring → Repair Verification", "Household Survey → Hygiene Follow-up"],
        "mobile_guidance": ["Require GPS for assets", "Allow photo evidence", "Work offline", "Warn for duplicate infrastructure GPS"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent required for household-level personal data",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Household",
                "secondaryEntityTypes": ["Water Point", "Facility", "Community"],
                "codeFormat": "WAS-YYYY-000001",
                "duplicateFields": ["Household ID", "Name + Village", "GPS"],
                "profileUpdateRule": "Require review for name, phone, village, and GPS changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Registration → Assessment → Monitoring → Verification",
                "prerequisites": "Assets and households should be registered before monitoring records are counted.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Monthly",
                "dataSource": "Approved household WASH, water point, infrastructure, and hygiene session forms",
                "disaggregation": ["Location", "Water source type", "Household size", "Facility type"],
            },
        },
    },
    "humanitarian": {
        "id": "humanitarian",
        "name": "Humanitarian Response and Protection",
        "sector": "Humanitarian",
        "description": "For rapid registration, vulnerability screening, distributions, complaints, referrals, incidents, and emergency monitoring.",
        "terminology": {
            "primary_entity": "Household or Beneficiary",
            "secondary_entities": "Case, Distribution Site, Community",
            "field_visit": "Response visit",
            "submission": "Response record",
        },
        "entity_types": ["Household", "Beneficiary", "Case", "Distribution Site", "Community", "Group"],
        "form_templates": ["Rapid Household Registration", "Vulnerability Assessment", "Distribution Verification", "Complaint Intake", "Incident Report", "Post-Distribution Monitoring"],
        "indicator_templates": ["Households registered", "People assisted", "Distribution coverage", "Complaints resolved", "Protection referrals completed", "Post-distribution satisfaction"],
        "dashboard_widgets": ["Response coverage", "Distribution status", "Complaint queue", "Protection referrals", "Data sensitivity"],
        "report_templates": ["Situation report", "Distribution report", "Complaint accountability report", "Protection referral report", "Donor response report"],
        "validation_rules": ["Consent required for PII", "Distribution quantity cannot be negative", "Incident date cannot be in the future", "Household size must be realistic"],
        "data_quality_rules": ["Duplicate household by phone, ID, or name + location", "Repeated baseline or registration", "Sensitive data exposure risk", "GPS outside response area"],
        "workflows": ["Registration → Vulnerability Assessment → Distribution → Post-Distribution Monitoring", "Complaint Intake → Review → Resolution"],
        "mobile_guidance": ["Support offline registration", "Mask sensitive records", "Prefill assigned households", "Warn outside assigned response area"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Data Manager Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent, protection, and do-no-harm controls required for identifiable records",
            "sensitiveDataControls": "Mask protection, complaint, and identity fields unless role permits access",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Household",
                "secondaryEntityTypes": ["Beneficiary", "Case", "Distribution Site"],
                "codeFormat": "HH-YYYY-000001",
                "duplicateFields": ["Phone", "National ID", "Household ID", "Name + Village", "GPS"],
                "profileUpdateRule": "Require review for name, phone, village, and GPS changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Registration → Vulnerability Assessment → Distribution → Post-Distribution Monitoring",
                "prerequisites": "Registration and vulnerability status should be approved before assistance counts in reports.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Monthly",
                "dataSource": "Approved registration, distribution, complaint, and monitoring forms",
                "disaggregation": ["Sex", "Age", "Location", "Disability status", "Vulnerability category"],
            },
        },
    },
    "custom": {
        "id": "custom",
        "name": "Custom Operations",
        "sector": "Custom",
        "description": "For teams that need their own terminology, entity types, metrics, workflows, and reporting model.",
        "terminology": {
            "primary_entity": "Record",
            "secondary_entities": "Related entities",
            "field_visit": "Field visit",
            "submission": "Operational record",
        },
        "entity_types": ["Record", "Location", "Facility", "Asset", "Product", "Person", "Custom Entity"],
        "form_templates": ["Record Registration", "Assessment", "Operational Checklist", "Follow-up Record", "Incident Report"],
        "indicator_templates": ["Records created", "Activities completed", "Completion rate", "Quality score", "Issues resolved"],
        "dashboard_widgets": ["Coverage", "Submissions", "Approvals", "Data quality", "Field activity"],
        "report_templates": ["Monthly operations report", "Project performance report", "Quality summary report"],
        "validation_rules": ["Required fields", "Date cannot be in the future", "Numeric values must be realistic"],
        "data_quality_rules": ["Duplicates", "Missing values", "GPS issues", "Outliers", "Inconsistent answers"],
        "workflows": ["Registration → Assessment → Follow-up → Reporting"],
        "mobile_guidance": ["Allow offline collection", "Assign work before collection", "Sync when connectivity returns"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Under Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Set consent rules only where personal or sensitive data is collected",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Record",
                "secondaryEntityTypes": ["Location", "Facility", "Asset", "Person"],
                "codeFormat": "REC-YYYY-000001",
                "duplicateFields": ["External ID", "Name + Location", "GPS"],
                "profileUpdateRule": "Require review for identity and critical field changes",
            },
            "forms": {
                "starterPack": "Use form templates",
                "journey": "Registration → Assessment → Follow-up → Reporting",
                "prerequisites": "Define source-of-truth forms only when records update official profiles or reports.",
            },
            "indicators": {
                "setupMode": "Configure later",
                "frequency": "Monthly",
                "dataSource": "Approved forms and reviewed submissions",
                "disaggregation": ["Location", "Category", "Status"],
            },
        },
    },
    "nutrition": {
        "id": "nutrition",
        "name": "Nutrition and Food Security",
        "sector": "Nutrition",
        "description": "For growth monitoring, MUAC and anthropometric screening, supplementary feeding, IYCF counselling, and food security programs.",
        "terminology": {
            "primary_entity": "Child",
            "secondary_entities": "Caregiver, Household",
            "field_visit": "Screening visit",
            "submission": "Screening record",
        },
        "entity_types": ["Child", "Caregiver", "Household", "Feeding Site"],
        "form_templates": ["Child Enrollment", "Anthropometric Screening", "MUAC Screening", "Supplementary Feeding Distribution", "IYCF Counselling", "Discharge Survey"],
        "indicator_templates": ["Children screened", "Global acute malnutrition rate", "Children admitted to feeding program", "Recovery rate", "Caregivers counselled", "Defaulter rate"],
        "dashboard_widgets": ["Screening coverage", "Malnutrition rates", "Admissions and discharges", "Recovery vs defaulter", "Site coverage"],
        "report_templates": ["Monthly nutrition report", "Admission and outcome report", "Screening coverage report", "Donor results report"],
        "validation_rules": ["MUAC must be within plausible range", "Weight and height must match age plausibility", "Discharge requires an admission record", "Caregiver consent required for child enrollment"],
        "data_quality_rules": ["Duplicate child by name + caregiver + village", "Implausible anthropometric outliers", "Static GPS across many screenings", "Digit preference in measurements"],
        "workflows": ["Enrollment → Screening → Feeding → Discharge", "Screening → Referral → Follow-up", "Counselling → Follow-up visit"],
        "mobile_guidance": ["Require GPS at screening site", "Allow offline collection", "Prefill enrolled children", "Flag implausible measurements on device"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Nutrition Officer Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Caregiver consent required before collecting child or household data",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Child",
                "secondaryEntityTypes": ["Caregiver", "Household"],
                "codeFormat": "CHD-YYYY-000001",
                "duplicateFields": ["Name + Caregiver", "Household ID", "Date of birth", "Name + Village"],
                "profileUpdateRule": "Require review for name, caregiver, and date-of-birth changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Child Enrollment → Anthropometric Screening → Supplementary Feeding → Discharge Survey",
                "prerequisites": "Enrollment should be approved before screening. Admission required before discharge.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Monthly",
                "dataSource": "Approved screening, feeding, and discharge forms",
                "disaggregation": ["Sex", "Age group", "Site", "Admission category"],
            },
        },
    },
    "livelihoods": {
        "id": "livelihoods",
        "name": "Livelihoods and Economic Empowerment",
        "sector": "Livelihoods",
        "description": "For cash transfers, vocational training, savings groups, enterprise support, and income-generating activity programs.",
        "terminology": {
            "primary_entity": "Participant",
            "secondary_entities": "Household, Group, Enterprise",
            "field_visit": "Monitoring visit",
            "submission": "Participant record",
        },
        "entity_types": ["Participant", "Household", "Savings Group", "Enterprise"],
        "form_templates": ["Participant Registration", "Baseline Income Survey", "Cash Transfer Distribution", "Training Attendance", "Savings Group Monitoring", "Endline Income Survey"],
        "indicator_templates": ["Participants registered", "Participants trained", "Cash transfers disbursed", "Active savings groups", "Enterprises supported", "Households with increased income"],
        "dashboard_widgets": ["Participant coverage", "Cash disbursement", "Training completion", "Savings group activity", "Income progress"],
        "report_templates": ["Monthly livelihoods report", "Cash transfer report", "Savings group report", "Donor results report"],
        "validation_rules": ["Transfer amount cannot be negative", "Income values must be plausible", "Distribution requires a registered participant", "Phone or participant ID required for registration"],
        "data_quality_rules": ["Duplicate participant by phone or national ID", "Repeated transfers to same account", "Income outliers", "Static GPS across distributions"],
        "workflows": ["Registration → Baseline → Activity → Endline", "Training → Follow-up", "Distribution → Verification"],
        "mobile_guidance": ["Capture GPS at distribution point", "Allow offline collection", "Prefill assigned participants", "Confirm identity before transfer"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Data Manager Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent required before collecting participant or household financial data",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Participant",
                "secondaryEntityTypes": ["Household", "Savings Group", "Enterprise"],
                "codeFormat": "PTC-YYYY-000001",
                "duplicateFields": ["Phone", "National ID", "Name + Village", "Bank or wallet account"],
                "profileUpdateRule": "Require review for name, phone, and payment account changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Participant Registration → Baseline → Cash Transfer / Training → Endline",
                "prerequisites": "Registration should be approved before distribution or training.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Quarterly",
                "dataSource": "Approved registration, transfer, training, and savings forms",
                "disaggregation": ["Sex", "Age", "Group", "Activity type"],
            },
        },
    },
    "protection": {
        "id": "protection",
        "name": "Protection and GBV Case Management",
        "sector": "Protection",
        "description": "For protection monitoring, GBV and child protection case management, referrals, and psychosocial support — with heightened confidentiality.",
        "terminology": {
            "primary_entity": "Case",
            "secondary_entities": "Survivor, Household",
            "field_visit": "Case visit",
            "submission": "Case record",
        },
        "entity_types": ["Case", "Survivor", "Household"],
        "form_templates": ["Case Intake", "Needs Assessment", "Referral Form", "Psychosocial Support Session", "Case Follow-up", "Case Closure"],
        "indicator_templates": ["Cases opened", "Cases referred", "Support sessions delivered", "Cases closed", "Referral completion rate", "Average time to first response"],
        "dashboard_widgets": ["Open cases", "Referral status", "Response time", "Case outcomes", "Support coverage"],
        "report_templates": ["Confidential case summary", "Referral outcome report", "Service delivery report", "Aggregated donor report"],
        "validation_rules": ["Closure requires an intake record", "Consent required before case intake", "Referral requires a destination service", "Follow-up date cannot precede intake"],
        "data_quality_rules": ["Duplicate case by survivor reference", "Cases without consent flag", "Overdue follow-ups", "Referrals without outcome"],
        "workflows": ["Intake → Assessment → Referral → Follow-up → Closure", "Referral → Outcome verification", "Support session → Follow-up"],
        "mobile_guidance": ["Mask sensitive fields by default", "Require consent before intake", "Limit GPS to general area", "Restrict offline storage on shared devices"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Case Worker Review → Protection Officer Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Informed consent and confidentiality required for all case data",
            "sensitiveDataControls": "Mask survivor identity for non-case roles; restrict exports",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Case",
                "secondaryEntityTypes": ["Survivor", "Household"],
                "codeFormat": "CASE-YYYY-000001",
                "duplicateFields": ["Survivor reference", "Case ID"],
                "profileUpdateRule": "Restrict edits to assigned case workers with review",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Case Intake → Needs Assessment → Referral → Follow-up → Closure",
                "prerequisites": "Consent and intake required before any further case action.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Monthly",
                "dataSource": "Approved, de-identified case records",
                "disaggregation": ["Sex", "Age group", "Case type", "Referral status"],
            },
        },
    },
    "governance": {
        "id": "governance",
        "name": "Governance and Civic Participation",
        "sector": "Governance",
        "description": "For citizen engagement, service delivery monitoring, social accountability, civic education, and participatory governance programs.",
        "terminology": {
            "primary_entity": "Citizen",
            "secondary_entities": "Community, Facility, Group",
            "field_visit": "Monitoring visit",
            "submission": "Monitoring record",
        },
        "entity_types": ["Citizen", "Community", "Public Facility", "Civic Group"],
        "form_templates": ["Citizen Registration", "Service Delivery Scorecard", "Public Facility Assessment", "Civic Education Attendance", "Community Feedback", "Endline Survey"],
        "indicator_templates": ["Citizens engaged", "Facilities assessed", "Scorecards completed", "Feedback resolved", "Civic sessions held", "Citizen satisfaction rate"],
        "dashboard_widgets": ["Engagement coverage", "Facility scores", "Feedback resolution", "Civic participation", "Satisfaction trends"],
        "report_templates": ["Monthly governance report", "Service delivery scorecard report", "Citizen feedback report", "Donor results report"],
        "validation_rules": ["Scorecard scores within allowed range", "Facility assessment requires a registered facility", "Feedback requires a category", "Phone optional but validated when provided"],
        "data_quality_rules": ["Duplicate citizen by phone or name + community", "Scorecard outliers", "Static GPS across assessments", "Unresolved feedback aging"],
        "workflows": ["Registration → Engagement → Scorecard → Feedback", "Facility assessment → Action plan", "Feedback → Resolution"],
        "mobile_guidance": ["Capture GPS at facility or community", "Allow offline collection", "Prefill assigned communities", "Support anonymous feedback"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Data Manager Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent required before collecting identifiable citizen data",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Citizen",
                "secondaryEntityTypes": ["Community", "Public Facility", "Civic Group"],
                "codeFormat": "CIT-YYYY-000001",
                "duplicateFields": ["Phone", "National ID", "Name + Community"],
                "profileUpdateRule": "Require review for name and contact changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Citizen Registration → Service Scorecard → Community Feedback → Endline",
                "prerequisites": "Register communities and facilities before assessments.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Quarterly",
                "dataSource": "Approved scorecard, assessment, and feedback forms",
                "disaggregation": ["Sex", "Age", "Community", "Facility type"],
            },
        },
    },
    "environment": {
        "id": "environment",
        "name": "Environment and Climate Resilience",
        "sector": "Environment",
        "description": "For natural resource management, reforestation, climate-smart agriculture, conservation, and environmental monitoring programs.",
        "terminology": {
            "primary_entity": "Site",
            "secondary_entities": "Community, Household, Plot",
            "field_visit": "Field assessment",
            "submission": "Site record",
        },
        "entity_types": ["Site", "Community", "Household", "Conservation Plot"],
        "form_templates": ["Site Registration", "Baseline Environmental Assessment", "Tree Planting Record", "Conservation Activity", "Climate Adaptation Survey", "Endline Assessment"],
        "indicator_templates": ["Sites registered", "Hectares restored", "Trees planted and surviving", "Households adopting practices", "Conservation activities completed", "Emissions or resource use reduced"],
        "dashboard_widgets": ["Site coverage", "Restoration progress", "Tree survival rate", "Practice adoption", "Activity completion"],
        "report_templates": ["Monthly environment report", "Restoration progress report", "Conservation activity report", "Donor results report"],
        "validation_rules": ["Area cannot be negative", "Tree count plausibility check", "Survival rate cannot exceed planted count", "GPS required for site registration"],
        "data_quality_rules": ["Duplicate site by GPS or name", "Implausible area or count outliers", "Static GPS across many sites", "Survival exceeding planting"],
        "workflows": ["Registration → Baseline → Activity → Endline", "Planting → Survival monitoring", "Assessment → Action plan"],
        "mobile_guidance": ["Require GPS and polygon for sites", "Allow offline collection", "Prefill assigned sites", "Capture before and after photos"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Supervisor Review → Data Manager Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent required where household or community data is collected",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Site",
                "secondaryEntityTypes": ["Community", "Household", "Conservation Plot"],
                "codeFormat": "SITE-YYYY-000001",
                "duplicateFields": ["GPS", "Site name + Community"],
                "profileUpdateRule": "Require review for boundary and location changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Site Registration → Baseline Assessment → Activity → Endline Assessment",
                "prerequisites": "Register and map sites before activity monitoring.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Seasonal",
                "dataSource": "Approved site, planting, and conservation forms",
                "disaggregation": ["Site type", "Community", "Activity type"],
            },
        },
    },
    "research": {
        "id": "research",
        "name": "Research and Surveys",
        "sector": "Research",
        "description": "For baseline and endline studies, impact evaluations, longitudinal panels, and standalone survey research across any sector.",
        "terminology": {
            "primary_entity": "Respondent",
            "secondary_entities": "Household, Cluster",
            "field_visit": "Interview",
            "submission": "Interview record",
        },
        "entity_types": ["Respondent", "Household", "Cluster", "Enumeration Area"],
        "form_templates": ["Respondent Listing", "Household Roster", "Baseline Questionnaire", "Follow-up Questionnaire", "Endline Questionnaire", "Consent Form"],
        "indicator_templates": ["Respondents interviewed", "Response rate", "Completion rate", "Attrition rate", "Treatment vs control coverage", "Data quality score"],
        "dashboard_widgets": ["Interview progress", "Response rate", "Cluster coverage", "Attrition", "Enumerator productivity"],
        "report_templates": ["Fieldwork progress report", "Response rate report", "Data quality report", "Study results report"],
        "validation_rules": ["Consent required before interview", "Skip logic must be respected", "Interview duration plausibility", "Respondent must belong to a sampled cluster"],
        "data_quality_rules": ["Duplicate respondent by ID", "Short interview duration", "Straight-lining in responses", "Enumerator GPS outside cluster"],
        "workflows": ["Listing → Sampling → Baseline → Follow-up → Endline", "Interview → Back-check", "Consent → Interview"],
        "mobile_guidance": ["Capture GPS at interview", "Allow offline collection", "Prefill sampled respondents", "Track interview duration"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Field Supervisor Review → Research Lead Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Informed consent required and stored for every respondent",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Respondent",
                "secondaryEntityTypes": ["Household", "Cluster"],
                "codeFormat": "RES-YYYY-000001",
                "duplicateFields": ["Respondent ID", "Name + Household", "Phone"],
                "profileUpdateRule": "Restrict edits during active fieldwork to maintain sample integrity",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": "Respondent Listing → Baseline → Follow-up → Endline",
                "prerequisites": "Complete listing and sampling before baseline interviews.",
            },
            "indicators": {
                "setupMode": "Configure later",
                "frequency": "Per study round",
                "dataSource": "Approved survey questionnaires",
                "disaggregation": ["Sex", "Age", "Cluster", "Treatment arm"],
            },
        },
    },
}


def _operational_pack(
    *,
    pack_id: str,
    name: str,
    sector: str,
    primary_entity: str,
    secondary_entities: list[str],
    code_prefix: str,
    forms: list[str],
    metrics: list[str],
    widgets: list[str],
    reports: list[str],
    validation_rules: list[str],
    data_quality_rules: list[str],
    workflows: list[str],
    mobile_guidance: list[str],
    manager_role: str,
    description: str,
) -> SectorPack:
    entity_types = [primary_entity, *secondary_entities]
    return {
        "id": pack_id,
        "name": name,
        "sector": sector,
        "description": description,
        "terminology": {
            "primary_entity": primary_entity,
            "secondary_entities": ", ".join(secondary_entities),
            "field_visit": "Field activity",
            "submission": f"{primary_entity} record",
            "metric": "Metric",
            "report_owner_role": manager_role,
        },
        "entity_types": entity_types,
        "form_templates": forms,
        "indicator_templates": metrics,
        "dashboard_widgets": widgets,
        "report_templates": reports,
        "validation_rules": validation_rules,
        "data_quality_rules": data_quality_rules,
        "workflows": workflows,
        "mobile_guidance": mobile_guidance,
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Under Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Set consent rules only where personal or sensitive data is collected",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": primary_entity,
                "secondaryEntityTypes": secondary_entities[:4],
                "codeFormat": f"{code_prefix}-YYYY-000001",
                "duplicateFields": ["External ID", "Name + Location", "GPS"],
                "profileUpdateRule": "Require review for identity and critical field changes",
            },
            "forms": {
                "starterPack": "Install project starter pack",
                "journey": workflows[0] if workflows else "Registration → Assessment → Follow-up → Reporting",
                "prerequisites": "Configure prerequisites only for workflows that require a previous approved record.",
            },
            "indicators": {
                "setupMode": "Use indicator templates",
                "frequency": "Monthly",
                "dataSource": "Approved forms and reviewed submissions",
                "disaggregation": ["Location", "Category", "Status"],
            },
        },
    }


SECTOR_PACKS.update(
    {
        "retail": _operational_pack(
            pack_id="retail",
            name="Retail and Store Operations",
            sector="Retail",
            primary_entity="Product",
            secondary_entities=["Store", "Brand", "Supplier", "Customer"],
            code_prefix="PRD",
            forms=["Product Registration", "Store Stock Count", "Price Check", "Sales Visit", "Supplier Delivery"],
            metrics=["Products in stock", "Stock-out rate", "Sales visits completed", "Price variance", "Supplier deliveries received"],
            widgets=["Stock levels", "Store coverage", "Price variance", "Supplier performance", "Sales activity"],
            reports=["Store operations report", "Inventory variance report", "Supplier delivery report"],
            validation_rules=["Stock count cannot be negative", "Sale date cannot be in the future", "Product code required for stock records"],
            data_quality_rules=["Duplicate product by SKU or barcode", "Unexpected stock variance", "Missing store location", "Repeated identical stock counts"],
            workflows=["Product Registration → Stock Count → Sales Visit → Reorder Review"],
            mobile_guidance=["Prefill assigned stores", "Scan barcode or QR where available", "Allow offline stock counts"],
            manager_role="Retail Operations Manager",
            description="For stores, products, brands, suppliers, stock counts, price checks, and sales operations.",
        ),
        "inventory": _operational_pack(
            pack_id="inventory",
            name="Inventory and Stock Management",
            sector="Inventory",
            primary_entity="Stock Item",
            secondary_entities=["Warehouse", "Store", "Supplier", "Batch"],
            code_prefix="STK",
            forms=["Stock Item Registration", "Stock Count", "Stock Receipt", "Stock Issue", "Variance Report"],
            metrics=["Items counted", "Stock variance", "Receipts recorded", "Issues recorded", "Reorder alerts"],
            widgets=["Warehouse stock", "Variance queue", "Receipts and issues", "Reorder risk", "Stock accuracy"],
            reports=["Inventory count report", "Stock movement report", "Variance resolution report"],
            validation_rules=["Quantity cannot be negative", "Receipt date cannot be in the future", "SKU or item code required"],
            data_quality_rules=["Duplicate item by SKU", "Large count variance", "Missing warehouse", "Unmatched receipt or issue"],
            workflows=["Item Registration → Stock Count → Variance Review → Reorder Action"],
            mobile_guidance=["Support offline counts", "Scan barcode or QR where available", "Flag large variance before sync"],
            manager_role="Inventory Manager",
            description="For warehouses, stock items, suppliers, counts, receipts, issues, and variance resolution.",
        ),
        "logistics": _operational_pack(
            pack_id="logistics",
            name="Logistics and Delivery Operations",
            sector="Logistics",
            primary_entity="Shipment",
            secondary_entities=["Vehicle", "Route", "Warehouse", "Delivery Point"],
            code_prefix="SHP",
            forms=["Shipment Registration", "Delivery Confirmation", "Route Check", "Vehicle Inspection", "Incident Report"],
            metrics=["Shipments delivered", "On-time delivery rate", "Route checks completed", "Vehicle issues", "Delivery incidents"],
            widgets=["Delivery status", "Route coverage", "Vehicle readiness", "Incidents", "Proof of delivery"],
            reports=["Delivery operations report", "Route exception report", "Vehicle inspection report"],
            validation_rules=["Delivery date cannot be in the future", "Proof of delivery required when configured", "Quantity delivered cannot be negative"],
            data_quality_rules=["Duplicate shipment code", "GPS outside route", "Missing delivery evidence", "Delayed delivery without reason"],
            workflows=["Shipment Registration → Delivery Confirmation → Exception Review → Closure"],
            mobile_guidance=["Capture GPS and proof of delivery", "Allow offline route work", "Warn outside assigned route"],
            manager_role="Logistics Manager",
            description="For shipments, delivery proof, route checks, vehicle inspections, warehouses, and incidents.",
        ),
        "sales": _operational_pack(
            pack_id="sales",
            name="Sales and Customer Operations",
            sector="Sales",
            primary_entity="Customer",
            secondary_entities=["Lead", "Opportunity", "Product", "Sales Territory"],
            code_prefix="CUS",
            forms=["Lead Capture", "Customer Visit", "Opportunity Update", "Order Capture", "Customer Feedback"],
            metrics=["Leads captured", "Visits completed", "Conversion rate", "Orders captured", "Customer feedback score"],
            widgets=["Pipeline activity", "Visit coverage", "Orders", "Conversion", "Customer feedback"],
            reports=["Sales activity report", "Pipeline progress report", "Customer feedback report"],
            validation_rules=["Order amount cannot be negative", "Visit date cannot be in the future", "Customer name or account ID required"],
            data_quality_rules=["Duplicate customer by phone or account ID", "Repeated identical visits", "Missing territory", "Unusual order amount"],
            workflows=["Lead Capture → Customer Visit → Opportunity Update → Order Capture"],
            mobile_guidance=["Prefill assigned customers", "Capture visit GPS when required", "Sync orders quickly when online"],
            manager_role="Sales Manager",
            description="For leads, customers, sales visits, opportunities, orders, and customer feedback.",
        ),
        "manufacturing": _operational_pack(
            pack_id="manufacturing",
            name="Manufacturing and Production",
            sector="Manufacturing",
            primary_entity="Production Batch",
            secondary_entities=["Machine", "Production Line", "Quality Check", "Material"],
            code_prefix="BAT",
            forms=["Production Batch", "Quality Check", "Machine Inspection", "Downtime Report", "Waste Record"],
            metrics=["Batches completed", "Quality pass rate", "Downtime hours", "Waste rate", "Output quantity"],
            widgets=["Production output", "Quality findings", "Downtime", "Waste", "Line performance"],
            reports=["Production report", "Quality exception report", "Downtime report"],
            validation_rules=["Output quantity cannot be negative", "Production date cannot be in the future", "Batch code required"],
            data_quality_rules=["Duplicate batch code", "Quality outliers", "Downtime without reason", "Waste exceeding output"],
            workflows=["Batch Start → Quality Check → Downtime/Waste Review → Batch Closure"],
            mobile_guidance=["Work offline on production floor", "Capture machine/line context", "Flag critical quality failures"],
            manager_role="Production Manager",
            description="For batches, production lines, machines, quality checks, downtime, waste, and output tracking.",
        ),
        "hr": _operational_pack(
            pack_id="hr",
            name="Human Resources and Workforce",
            sector="HR",
            primary_entity="Employee",
            secondary_entities=["Department", "Training", "Attendance Record", "Asset"],
            code_prefix="EMP",
            forms=["Employee Profile", "Attendance Check", "Training Record", "Performance Review", "Asset Assignment"],
            metrics=["Employees active", "Attendance rate", "Trainings completed", "Reviews completed", "Assets assigned"],
            widgets=["Workforce status", "Attendance", "Training", "Performance", "Asset custody"],
            reports=["Workforce operations report", "Training compliance report", "Attendance report"],
            validation_rules=["Hire date cannot be in the future", "Employee ID required", "Attendance hours must be realistic"],
            data_quality_rules=["Duplicate employee ID", "Missing department", "Repeated attendance", "Expired training"],
            workflows=["Employee Profile → Attendance/Training → Performance Review → Action Plan"],
            mobile_guidance=["Restrict sensitive HR fields", "Allow offline attendance where needed", "Sync supervisor approvals"],
            manager_role="HR Manager",
            description="For employee records, attendance, training, performance, departments, and assigned assets.",
        ),
        "audits": _operational_pack(
            pack_id="audits",
            name="Audits and Compliance",
            sector="Audits",
            primary_entity="Audit Item",
            secondary_entities=["Finding", "Risk", "Evidence", "Corrective Action"],
            code_prefix="AUD",
            forms=["Audit Checklist", "Compliance Review", "Finding Report", "Corrective Action Follow-up", "Risk Assessment"],
            metrics=["Audit items reviewed", "Findings opened", "Findings closed", "Compliance rate", "High-risk issues"],
            widgets=["Audit progress", "Findings", "Risk levels", "Corrective actions", "Evidence completeness"],
            reports=["Audit findings report", "Compliance summary report", "Corrective action report"],
            validation_rules=["Finding severity required", "Evidence required for critical findings", "Due date cannot precede audit date"],
            data_quality_rules=["Duplicate finding", "Missing evidence", "Overdue corrective action", "Conflicting compliance status"],
            workflows=["Audit Checklist → Finding Report → Corrective Action → Closure Review"],
            mobile_guidance=["Capture photo/file evidence", "Work offline during site audits", "Flag critical findings immediately"],
            manager_role="Compliance Manager",
            description="For audits, compliance checks, findings, evidence, risks, and corrective actions.",
        ),
        "inspections": _operational_pack(
            pack_id="inspections",
            name="Inspections and Field Checks",
            sector="Inspections",
            primary_entity="Inspection Site",
            secondary_entities=["Asset", "Finding", "Corrective Action", "Inspector"],
            code_prefix="INS",
            forms=["Site Inspection", "Safety Checklist", "Defect Report", "Corrective Action Follow-up", "Compliance Visit"],
            metrics=["Inspections completed", "Pass rate", "Defects found", "Corrective actions closed", "Critical risks"],
            widgets=["Inspection coverage", "Defects", "Pass/fail status", "Corrective actions", "GPS evidence"],
            reports=["Inspection report", "Safety exception report", "Corrective action report"],
            validation_rules=["Inspection date cannot be in the future", "Critical defect requires evidence", "Site or asset required"],
            data_quality_rules=["Duplicate site inspection", "Missing GPS or evidence", "Static GPS", "Repeated identical checklist"],
            workflows=["Inspection → Defect Report → Corrective Action → Verification"],
            mobile_guidance=["Capture GPS and photos", "Allow offline inspections", "Warn outside assigned site"],
            manager_role="Inspection Manager",
            description="For sites, assets, field inspections, safety checks, defects, and corrective actions.",
        ),
        "assets": _operational_pack(
            pack_id="assets",
            name="Asset Management",
            sector="Assets",
            primary_entity="Asset",
            secondary_entities=["Location", "Custodian", "Maintenance Record", "Transfer"],
            code_prefix="AST",
            forms=["Asset Registration", "Condition Check", "Maintenance Visit", "Asset Transfer", "Loss Report"],
            metrics=["Assets registered", "Condition checks completed", "Maintenance completed", "Transfers recorded", "Assets at risk"],
            widgets=["Asset registry", "Condition", "Maintenance", "Transfers", "Loss reports"],
            reports=["Asset register report", "Maintenance report", "Asset exception report"],
            validation_rules=["Asset code required", "Purchase date cannot be in the future", "Condition required for checks"],
            data_quality_rules=["Duplicate asset code or serial number", "Missing location", "Unmatched transfer", "Overdue maintenance"],
            workflows=["Asset Registration → Condition Check → Maintenance/Transfer → Review"],
            mobile_guidance=["Scan asset QR/barcode", "Capture condition photos", "Work offline in facilities"],
            manager_role="Asset Manager",
            description="For assets, custodians, locations, condition checks, maintenance, transfers, and loss reports.",
        ),
    }
)


def _as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}

def list_sector_packs() -> list[SectorPack]:
    ordered = [pack for sector_id, pack in SECTOR_PACKS.items() if sector_id != "custom"]
    custom_pack = SECTOR_PACKS.get("custom")
    if custom_pack:
        ordered.append(custom_pack)
    return [_enriched_sector_pack(pack) for pack in ordered]


def get_sector_pack(sector_id: str | None) -> SectorPack | None:
    if not sector_id:
        return None
    pack = SECTOR_PACKS.get(sector_id.strip().lower())
    return _enriched_sector_pack(pack) if pack else None


def apply_sector_pack(settings: dict[str, Any] | None, sector_id: str | None) -> dict[str, Any]:
    next_settings: dict[str, Any] = deepcopy(settings or {})
    pack = get_sector_pack(sector_id)
    if pack is None:
        if sector_id:
            next_settings["sector"] = {
                "id": sector_id.strip().lower(),
                "name": sector_id.strip().title(),
                "sector": sector_id.strip().title(),
                "custom": True,
            }
        return next_settings

    for section, section_defaults in pack.get("recommended_settings", {}).items():
        current = next_settings.get(section)
        if not isinstance(current, dict):
            current = {}
        next_settings[section] = {**section_defaults, **current}

    governance_current = next_settings.get("governance")
    if not isinstance(governance_current, dict):
        governance_current = {}
    next_settings["governance"] = {
        **pack.get("governance_defaults", {}),
        **governance_current,
    }
    next_settings["sector"] = {
        "id": pack["id"],
        "name": pack["name"],
        "sector": pack["sector"],
        "terminology": pack["terminology"],
        "entityTypes": pack["entity_types"],
        "formTemplates": pack["form_templates"],
        "formDefinitions": pack.get("form_definitions", []),
        "indicatorTemplates": pack["indicator_templates"],
        "indicatorDefinitions": pack.get("indicator_definitions", []),
        "dashboardWidgets": pack["dashboard_widgets"],
        "reportTemplates": pack["report_templates"],
        "reportDefinitions": pack.get("report_definitions", []),
        "validationRules": pack["validation_rules"],
        "dataQualityRules": pack["data_quality_rules"],
        "workflows": pack["workflows"],
        "mobileGuidance": pack["mobile_guidance"],
        "managerControls": pack.get("manager_controls", {}),
    }
    return next_settings


def sector_summary(settings: dict[str, Any] | None) -> tuple[str | None, str | None]:
    sector = (settings or {}).get("sector")
    if not isinstance(sector, dict):
        return None, None
    sector_id = sector.get("id")
    sector_name = sector.get("name") or sector.get("sector")
    return (
        str(sector_id) if sector_id else None,
        str(sector_name) if sector_name else None,
    )


def _enriched_sector_pack(pack: SectorPack | None) -> SectorPack:
    next_pack = deepcopy(pack or {})
    if not next_pack:
        return next_pack
    next_pack["form_definitions"] = [
        _form_definition(next_pack, str(template))
        for template in next_pack.get("form_templates", [])
    ]
    next_pack["indicator_definitions"] = [
        _indicator_definition(next_pack, str(indicator), index)
        for index, indicator in enumerate(next_pack.get("indicator_templates", []), start=1)
    ]
    next_pack["report_definitions"] = [
        _report_definition(next_pack, str(report))
        for report in next_pack.get("report_templates", [])
    ]
    next_pack["manager_controls"] = {
        "customizable": [
            "terminology",
            "entity_types",
            "form_templates",
            "indicator_templates",
            "validation_rules",
            "data_quality_rules",
            "dashboard_widgets",
            "report_templates",
            "mobile_guidance",
        ],
        "recommended_review_order": [
            "Terminology",
            "Entity model",
            "Starter forms",
            "Metric framework",
            "Validation and data quality",
            "Dashboard and report outputs",
            "Mobile field guidance",
        ],
        "expert_note": "Customize the pack before installing assets when funder/client wording, local terminology, entity types, or reporting rules differ from the default sector model.",
    }
    return next_pack


def _form_definition(pack: SectorPack, form_name: str) -> dict[str, Any]:
    kind = _form_kind(form_name)
    entity_type = _primary_entity(pack)
    questions = _base_questions(pack, entity_type)
    questions.extend(_questions_for_kind(pack, entity_type, kind))
    return {
        "name": form_name,
        "code": _variable_name(form_name),
        "form_type": kind,
        "entity_type": entity_type,
        "description": f"{form_name} template for {pack['sector']} work with configurable consent, entity linkage, GPS evidence, validation, and review controls.",
        "submission_frequency": _frequency_for_kind(kind),
        "creates_entity": kind == "registration",
        "updates_entity": kind != "registration",
        "requires_existing_entity": kind not in {"registration", "complaint", "incident", "event"},
        "questions": questions,
        "sections": [
            {
                "id": "identity-consent",
                "title": "Identity, consent, and location",
                "question_ids": [question["id"] for question in questions[:5]],
            },
            {
                "id": f"{kind}-content",
                "title": _section_title(kind),
                "question_ids": [question["id"] for question in questions[5:]],
            },
        ],
        "indicator_mappings": [
            {
                "question": question["variableName"],
                "indicator_hint": _indicator_hint(pack, question),
                "component": question.get("indicatorComponent", "evidence"),
            }
            for question in questions
            if question.get("indicatorComponent")
        ],
        "profile_mappings": {
            "entity_name": f"{entity_type}.Name",
            "phone_number": f"{entity_type}.Phone",
            "location_name": f"{entity_type}.Location",
            "gps_location": f"{entity_type}.GPS",
        },
        "validation_rules": pack.get("validation_rules", []),
        "data_quality_rules": pack.get("data_quality_rules", []),
        "mobile_guidance": pack.get("mobile_guidance", []),
    }


def _indicator_definition(pack: SectorPack, name: str, index: int) -> dict[str, Any]:
    lower_name = name.lower()
    unit = "percent" if any(term in lower_name for term in ["rate", "%", "coverage"]) else "count"
    return {
        "name": name,
        "code_hint": f"{str(pack['id']).upper()}.{index:02d}",
        "definition": f"Measures {name.lower()} for {pack['sector']} work using approved, reviewed project data.",
        "unit": unit,
        "frequency": _recommended_frequency(pack),
        "baseline_required": False,
        "target_required": False,
        "disaggregation": ((pack.get("recommended_settings") or {}).get("indicators") or {}).get("disaggregation", []),
        "data_source": ((pack.get("recommended_settings") or {}).get("indicators") or {}).get("dataSource", "Approved form submissions"),
        "approval_rule": "Only approved submissions count toward official results.",
    }


def _report_definition(pack: SectorPack, name: str) -> dict[str, Any]:
    return {
        "name": name,
        "description": f"Editable {pack['sector']} report package. Connect metrics, approved records, maps, data quality notes, and narrative before submission.",
        "sections": [
            "Executive summary",
            "Progress against metrics",
            "Entity coverage",
            "Geographic coverage and GPS evidence",
            "Data quality and approval status",
            "Risks, issues, and corrective actions",
            "Annex: cleaned data and audit trail",
        ],
        "outputs": ["pdf", "xlsx"],
        "requires_approved_data": True,
    }


def _base_questions(pack: SectorPack, entity_type: str) -> list[SectorQuestion]:
    consent_required = _consent_required(pack)
    gps_required = _gps_required(pack)
    return [
        {
            "id": "consent",
            "label": "Consent captured",
            "type": "consent",
            "required": consent_required,
            "variableName": "consent_captured",
            "definition": "Confirms consent when personal, sensitive, or regulated data is collected.",
            "sensitivity": "high",
            "validation": {"blockIfFalse": consent_required, "message": "Consent is required before continuing."},
        },
        {
            "id": "entity_name",
            "label": f"{entity_type} name",
            "type": "short_text",
            "required": gps_required,
            "variableName": "entity_name",
            "definition": f"Official {entity_type.lower()} name or primary identifier.",
            "sensitivity": "personal",
            "profileField": f"{entity_type}.Name",
        },
        {
            "id": "phone_number",
            "label": "Phone number",
            "type": "short_text",
            "required": False,
            "variableName": "phone_number",
            "definition": "Primary contact number used for duplicate checks and follow-up.",
            "sensitivity": "personal",
            "profileField": f"{entity_type}.Phone",
            "validation": {"regex": r"^[+0-9 ()-]{7,20}$", "message": "Enter a valid phone number or leave blank if unavailable."},
        },
        {
            "id": "location",
            "label": "Village or location",
            "type": "short_text",
            "required": True,
            "variableName": "location_name",
            "definition": "Project location name, village, facility, site, or community.",
            "sensitivity": "operational",
            "profileField": f"{entity_type}.Location",
        },
        {
            "id": "gps",
            "label": "GPS location",
            "type": "gps",
            "required": True,
            "variableName": "gps_location",
            "definition": "Collection location evidence used for coverage, duplicate, and field integrity checks.",
            "sensitivity": "location",
            "profileField": f"{entity_type}.GPS",
            "validation": {"accuracyMaximumMeters": 30, "message": "Wait for better GPS accuracy before submitting."},
        },
    ]


def _questions_for_kind(pack: SectorPack, entity_type: str, kind: str) -> list[SectorQuestion]:
    if kind == "registration":
        if not _person_like_entity(entity_type):
            return [
                _short_text_question("external_code", f"{entity_type} code", "External code, SKU, serial number, or reference ID."),
                _select_question("record_category", "Category", ["Primary", "Secondary", "Temporary", "Archived"], "Operational category for filtering and reporting."),
                _select_question("record_status", "Status", ["Active", "Inactive", "Pending review"], "Current status of this record."),
                _select_question("registration_source", "Registration source", ["Field visit", "Imported list", "System entry", "Partner source"], "Trace how the record entered the system."),
            ]
        return [
            _select_question("sex", "Sex", ["Female", "Male", "Other", "Prefer not to say"], "Sex disaggregation for unique reach reporting."),
            _number_question("age", "Age", "Age in completed years.", minimum=0, maximum=120),
            _select_question("disability_status", "Disability status", ["No disability", "Has disability", "Prefer not to say"], "Washington Group-aligned disaggregation placeholder."),
            _select_question("registration_source", "Registration source", ["Field visit", "Community list", "Partner referral", "Imported record"], "Trace how the entity entered the registry."),
        ]
    if kind == "inventory":
        return [
            _date_question("count_date", "Count date", "Date stock, product, supply, or asset quantity was checked."),
            _number_question("quantity_counted", "Quantity counted", "Quantity physically counted.", minimum=0, indicator_component="numerator"),
            _number_question("expected_quantity", "Expected quantity", "Expected system or ledger quantity.", minimum=0),
            _long_text_question("variance_reason", "Variance reason", "Reason for missing, excess, damaged, or unmatched stock."),
        ]
    if kind == "inspection":
        return [
            _date_question("inspection_date", "Inspection date", "Date the inspection, audit, compliance, or quality check happened."),
            _select_question("inspection_result", "Result", ["Pass", "Partial pass", "Fail", "Requires review"], "Overall inspection or audit result."),
            _select_question("risk_level", "Risk level", ["Low", "Medium", "High", "Critical"], "Risk level for supervisor action."),
            _long_text_question("corrective_action", "Corrective action", "Action required to resolve the finding or defect."),
        ]
    if kind == "delivery":
        return [
            _date_question("delivery_date", "Delivery date", "Date the shipment, order, or delivery was completed."),
            _number_question("quantity_delivered", "Quantity delivered", "Quantity delivered or received.", minimum=0, indicator_component="numerator"),
            _select_question("delivery_status", "Delivery status", ["Delivered", "Partially delivered", "Failed", "Requires review"], "Delivery outcome."),
            _long_text_question("delivery_notes", "Delivery notes", "Exception, recipient, or proof-of-delivery notes."),
        ]
    if kind == "asset":
        return [
            _date_question("asset_event_date", "Asset event date", "Date of asset check, transfer, maintenance, or loss event."),
            _select_question("asset_condition", "Asset condition", ["Good", "Fair", "Poor", "Lost", "Damaged"], "Current asset condition."),
            _short_text_question("custodian", "Custodian", "Person, team, or location responsible for the asset."),
            _long_text_question("asset_action", "Action required", "Maintenance, transfer, investigation, or follow-up action."),
        ]
    if kind in {"baseline", "assessment"}:
        return [
            _date_question("baseline_date", "Assessment date", "Date this baseline or assessment was completed."),
            _number_question("baseline_value", "Baseline value", "Starting value for the main project result.", minimum=0),
            _select_question("service_access", "Current service access", ["None", "Limited", "Adequate", "Good"], "Starting condition before support."),
            _long_text_question("priority_needs", "Priority needs", "Main needs, constraints, or support priorities identified."),
        ]
    if kind in {"monitoring", "follow-up"}:
        return [
            _date_question("visit_date", "Visit date", "Date of monitoring or follow-up visit."),
            _select_question("progress_status", "Progress status", ["On track", "Delayed", "At risk", "Completed"], "Manager review status from this visit."),
            _number_question("result_value", "Current result value", "Current measured value for the linked indicator.", minimum=0, indicator_component="numerator"),
            _long_text_question("follow_up_action", "Follow-up action required", "Action needed before the next visit or review."),
        ]
    if kind == "attendance":
        return [
            _date_question("event_date", "Event date", "Date of training, meeting, campaign, or attendance event."),
            _number_question("participants_total", "Total participants", "Total people attending the event.", minimum=0, indicator_component="numerator"),
            _number_question("participants_female", "Female participants", "Female participants for sex disaggregation.", minimum=0),
            _select_question("attendance_verified", "Attendance verified", ["Verified", "Partially verified", "Not verified"], "Evidence status for attendance records."),
        ]
    if kind == "distribution":
        return [
            _date_question("distribution_date", "Distribution date", "Date items or services were distributed."),
            _short_text_question("item_received", "Item or service received", "Name of item, service, or support package."),
            _number_question("quantity_received", "Quantity received", "Quantity received by the entity.", minimum=0, indicator_component="numerator"),
            _select_question("recipient_verified", "Recipient verified", ["Yes", "No", "Requires review"], "Confirms support reached the intended person or site."),
        ]
    if kind in {"complaint", "incident"}:
        return [
            _date_question("incident_date", "Incident or complaint date", "Date the issue occurred or was reported."),
            _select_question("severity", "Severity", ["Low", "Medium", "High", "Critical"], "Risk level for escalation."),
            _long_text_question("issue_summary", "Issue summary", "Brief factual description of the issue."),
            _select_question("requires_follow_up", "Requires follow-up", ["Yes", "No"], "Whether a task, case, or supervisor action is required."),
        ]
    return [
        _date_question("record_date", "Record date", "Date this record was collected."),
        _select_question("record_status", "Record status", ["Complete", "Partial", "Requires review"], "Completeness state for reviewer triage."),
        _long_text_question("observations", "Observations", "Operational notes relevant to the project."),
    ]


def _form_kind(name: str) -> str:
    text = name.lower()
    if "registration" in text or "intake" in text:
        return "registration"
    if "baseline" in text:
        return "baseline"
    if any(term in text for term in ["stock", "inventory", "count", "receipt", "issue", "variance"]):
        return "inventory"
    if any(term in text for term in ["inspection", "checklist", "audit", "compliance", "quality", "defect"]):
        return "inspection"
    if any(term in text for term in ["delivery", "shipment", "order"]):
        return "delivery"
    if any(term in text for term in ["asset", "condition", "maintenance", "transfer", "loss"]):
        return "asset"
    if "attendance" in text or "training" in text or "campaign" in text or "session" in text:
        return "attendance"
    if "distribution" in text:
        return "distribution"
    if "complaint" in text:
        return "complaint"
    if "incident" in text:
        return "incident"
    if "assessment" in text or "observation" in text:
        return "assessment"
    if "follow" in text or "referral" in text:
        return "follow-up"
    if "monitoring" in text or "visit" in text or "verification" in text or "endline" in text:
        return "monitoring"
    return "custom"


def _frequency_for_kind(kind: str) -> str:
    return {
        "registration": "once_ever",
        "baseline": "once_per_project",
        "attendance": "once_per_event",
        "distribution": "once_per_event",
        "inventory": "once_per_event",
        "inspection": "once_per_event",
        "delivery": "once_per_event",
        "asset": "unlimited",
        "complaint": "unlimited",
        "incident": "unlimited",
        "monitoring": "monthly",
    }.get(kind, "unlimited")


def _section_title(kind: str) -> str:
    return {
        "registration": "Profile and duplicate prevention",
        "baseline": "Baseline values and needs",
        "assessment": "Assessment findings",
        "monitoring": "Monitoring progress",
        "attendance": "Attendance evidence",
        "distribution": "Distribution evidence",
        "inventory": "Stock and variance details",
        "inspection": "Inspection findings",
        "delivery": "Delivery evidence",
        "asset": "Asset event details",
        "complaint": "Complaint details and follow-up",
        "incident": "Incident details and escalation",
        "follow-up": "Follow-up result",
    }.get(kind, "Record details")


def _primary_entity(pack: SectorPack) -> str:
    recommended = _as_dict(pack.get("recommended_settings"))
    beneficiary = _as_dict(recommended.get("beneficiary"))
    return str(beneficiary.get("primaryEntityType") or "Record")


def _recommended_frequency(pack: SectorPack) -> str:
    recommended = _as_dict(pack.get("recommended_settings"))
    indicators = _as_dict(recommended.get("indicators"))
    return str(indicators.get("frequency") or "Monthly").lower()


def _indicator_hint(pack: SectorPack, question: SectorQuestion) -> str:
    indicators = pack.get("indicator_templates", [])
    if not indicators:
        return "Project metric"
    if question.get("indicatorComponent") == "numerator":
        return str(indicators[0])
    return str(indicators[min(1, len(indicators) - 1)])


def _person_like_entity(entity_type: str) -> bool:
    text = entity_type.lower()
    return any(
        term in text
        for term in [
            "beneficiary",
            "client",
            "patient",
            "person",
            "participant",
            "respondent",
            "student",
            "teacher",
            "employee",
            "citizen",
            "farmer",
            "household",
            "child",
        ]
    )


def _variable_name(value: str) -> str:
    return "_".join(part for part in re_split(value.lower()) if part)


def _consent_required(pack: SectorPack) -> bool:
    governance = _as_dict(pack.get("governance_defaults"))
    policy = str(governance.get("consentPolicy") or "").lower()
    return "required" in policy and "where" not in policy and "only where" not in policy


def _gps_required(pack: SectorPack) -> bool:
    guidance = " ".join(str(item).lower() for item in pack.get("mobile_guidance", []))
    rules = " ".join(str(item).lower() for item in pack.get("validation_rules", []))
    return "require gps" in guidance or "gps required" in rules


def re_split(value: str) -> list[str]:
    import re

    return re.split(r"[^a-z0-9]+", value)


def _short_text_question(question_id: str, label: str, definition: str) -> SectorQuestion:
    return {"id": question_id, "label": label, "type": "short_text", "required": True, "variableName": _variable_name(question_id), "definition": definition, "sensitivity": "operational"}


def _long_text_question(question_id: str, label: str, definition: str) -> SectorQuestion:
    return {"id": question_id, "label": label, "type": "long_text", "required": False, "variableName": _variable_name(question_id), "definition": definition, "sensitivity": "operational"}


def _date_question(question_id: str, label: str, definition: str) -> SectorQuestion:
    return {"id": question_id, "label": label, "type": "date", "required": True, "variableName": _variable_name(question_id), "definition": definition, "sensitivity": "operational", "validation": {"notFuture": True, "message": "Date cannot be in the future."}}


def _number_question(question_id: str, label: str, definition: str, *, minimum: int = 0, maximum: int | None = None, indicator_component: str | None = None) -> SectorQuestion:
    validation: dict[str, Any] = {"min": minimum, "message": f"{label} must be realistic."}
    if maximum is not None:
        validation["max"] = maximum
    question: SectorQuestion = {"id": question_id, "label": label, "type": "number", "required": True, "variableName": _variable_name(question_id), "definition": definition, "sensitivity": "operational", "validation": validation}
    if indicator_component:
        question["indicatorComponent"] = indicator_component
    return question


def _select_question(question_id: str, label: str, options: list[str], definition: str) -> SectorQuestion:
    return {"id": question_id, "label": label, "type": "single_select", "required": True, "variableName": _variable_name(question_id), "definition": definition, "allowedValues": options, "options": [{"label": option, "value": _variable_name(option)} for option in options], "sensitivity": "operational"}
