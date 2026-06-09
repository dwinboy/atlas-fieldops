from copy import deepcopy
from typing import Any


SectorPack = dict[str, Any]


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
        "name": "Custom Sector",
        "sector": "Custom",
        "description": "For industries or programs that need their own terminology, entity types, indicators, workflows, and reporting model.",
        "terminology": {
            "primary_entity": "Entity",
            "secondary_entities": "Related entities",
            "field_visit": "Field visit",
            "submission": "Record",
        },
        "entity_types": ["Beneficiary", "Household", "Facility", "Group", "Custom Entity"],
        "form_templates": ["Registration", "Baseline", "Monitoring Visit", "Attendance", "Distribution", "Endline"],
        "indicator_templates": ["People reached", "Services delivered", "Coverage rate", "Completion rate", "Quality score"],
        "dashboard_widgets": ["Coverage", "Submissions", "Approvals", "Data quality", "Field activity"],
        "report_templates": ["Monthly operations report", "Project performance report", "Donor results report"],
        "validation_rules": ["Required fields", "Date cannot be in the future", "Numeric values must be realistic"],
        "data_quality_rules": ["Duplicates", "Missing values", "GPS issues", "Outliers", "Inconsistent answers"],
        "workflows": ["Registration → Baseline → Monitoring → Endline"],
        "mobile_guidance": ["Allow offline collection", "Assign work before collection", "Sync when connectivity returns"],
        "governance_defaults": {
            "approvalWorkflow": "Submitted → Under Review → Approved",
            "approvedDataOnly": True,
            "consentPolicy": "Consent required where personal data is collected",
        },
        "recommended_settings": {
            "beneficiary": {
                "primaryEntityType": "Beneficiary",
                "secondaryEntityTypes": ["Household", "Facility", "Group"],
                "codeFormat": "BEN-YYYY-000001",
                "duplicateFields": ["Phone", "National ID", "Household ID", "Name + Village", "GPS"],
                "profileUpdateRule": "Require review for name, phone, village, and GPS changes",
            },
            "forms": {
                "starterPack": "Use form templates",
                "journey": "Registration → Baseline → Monitoring → Endline",
                "prerequisites": "Define source-of-truth forms before field rollout.",
            },
            "indicators": {
                "setupMode": "Configure later",
                "frequency": "Monthly",
                "dataSource": "Approved forms and reviewed submissions",
                "disaggregation": ["Sex", "Age", "Location", "Disability status"],
            },
        },
    },
}


def list_sector_packs() -> list[SectorPack]:
    return [deepcopy(pack) for pack in SECTOR_PACKS.values()]


def get_sector_pack(sector_id: str | None) -> SectorPack | None:
    if not sector_id:
        return None
    return deepcopy(SECTOR_PACKS.get(sector_id.strip().lower()))


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
        "indicatorTemplates": pack["indicator_templates"],
        "dashboardWidgets": pack["dashboard_widgets"],
        "reportTemplates": pack["report_templates"],
        "validationRules": pack["validation_rules"],
        "dataQualityRules": pack["data_quality_rules"],
        "workflows": pack["workflows"],
        "mobileGuidance": pack["mobile_guidance"],
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
