from dataclasses import dataclass
from typing import Any

from app.schemas.collection import FormField, FormSchema


@dataclass(frozen=True)
class FormValidationIssue:
    field_id: str
    message: str


class FormEngine:
    """Offline-safe form validation primitives shared by API and future mobile clients."""

    def flatten_fields(self, schema: FormSchema) -> list[FormField]:
        fields: list[FormField] = []
        for section in schema.sections:
            fields.extend(section.fields)
        return fields

    def validate_schema(self, schema: FormSchema) -> list[FormValidationIssue]:
        issues: list[FormValidationIssue] = []
        seen_ids: set[str] = set()
        for field in self.flatten_fields(schema):
            if field.id in seen_ids:
                issues.append(FormValidationIssue(field.id, "Field IDs must be unique across the form."))
            seen_ids.add(field.id)
            if field.type in {"select", "multiselect", "radio", "checkbox"} and not field.options:
                issues.append(FormValidationIssue(field.id, "Choice fields require at least one option."))
            if field.type == "calculated" and not field.calculation:
                issues.append(FormValidationIssue(field.id, "Calculated fields require a calculation expression."))
            if field.type == "gps" and field.required is False:
                issues.append(FormValidationIssue(field.id, "GPS fields should be required for auditable field collection."))
        return issues

    def validate_submission(self, schema: FormSchema, payload: dict[str, Any]) -> list[FormValidationIssue]:
        issues: list[FormValidationIssue] = []
        for field in self.flatten_fields(schema):
            value = payload.get(field.id)
            if field.required and value in (None, "", []):
                issues.append(FormValidationIssue(field.id, "Required field is missing."))
            if value is None:
                continue
            minimum = field.validation.get("min")
            maximum = field.validation.get("max")
            if isinstance(value, int | float):
                if isinstance(minimum, int | float) and value < minimum:
                    issues.append(FormValidationIssue(field.id, f"Value must be at least {minimum}."))
                if isinstance(maximum, int | float) and value > maximum:
                    issues.append(FormValidationIssue(field.id, f"Value must be at most {maximum}."))
            if field.type == "gps":
                accuracy = value.get("accuracy") if isinstance(value, dict) else None
                accuracy_max = field.validation.get("accuracyMax")
                if isinstance(accuracy, int | float) and isinstance(accuracy_max, int | float) and accuracy > accuracy_max:
                    issues.append(FormValidationIssue(field.id, f"GPS accuracy must be within {accuracy_max} meters."))
        return issues

    def evaluate_relevance(self, expression: str, answers: dict[str, Any]) -> bool:
        # Small XLSForm-style subset: ${field} = 'value' and ${field} != 'value'.
        normalized = expression.strip()
        operator = "!=" if "!=" in normalized else "=" if "=" in normalized else ""
        if not operator:
            return False
        left, right = [part.strip() for part in normalized.split(operator, 1)]
        if not (left.startswith("${") and left.endswith("}")):
            return False
        field_id = left[2:-1]
        expected = right.strip("'\"")
        actual = str(answers.get(field_id, ""))
        return actual != expected if operator == "!=" else actual == expected
