import { type QuestionSuggestion } from "@/components/forms/formBuilderPresets";

export function inferQuestionSuggestions(question: string): QuestionSuggestion[] {
  const normalized = question.trim().toLowerCase();
  const addDefaults = (suggestions: QuestionSuggestion[]) => {
    const unique = suggestions.filter(
      (suggestion, index, all) =>
        all.findIndex((candidate) => candidate.type === suggestion.type) ===
        index,
    );
    return unique.slice(0, 4);
  };

  if (!normalized) {
    return [
      {
        confidence: "Best match",
        id: "question-text",
        label: "Short answer",
        type: "text",
        hint: "Best for names, IDs, and short responses.",
        reason: "Start by typing the question and Atlas will refine this.",
        settings: ["Required optional", "Auto variable name"],
      },
      {
        confidence: "Good option",
        id: "question-choice",
        label: "Single choice",
        type: "radio",
        hint: "Best when the respondent must choose one answer.",
        options: ["Yes", "No"],
        reason: "Useful for eligibility, confirmation, and status questions.",
        settings: ["Choice options", "Mobile friendly"],
      },
      {
        confidence: "Alternative",
        id: "question-number",
        label: "Number",
        type: "number",
        hint: "Best for age, counts, quantities, and scores.",
        validation: { min: 0 },
        reason: "Use when the answer should be calculated or validated.",
        settings: ["Min value 0", "Range ready"],
      },
    ];
  }

  const suggestions: QuestionSuggestion[] = [];
  const includesAny = (words: string[]) =>
    words.some((word) => normalized.includes(word));

  if (includesAny(["age", "years old"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-age",
      label: "Age question",
      type: "number",
      hint: "Age in completed years.",
      required: true,
      validation: { min: 0, max: 120 },
      reason: "Age should be numeric and range checked.",
      settings: ["Required", "Min 0", "Max 120"],
    });
  }

  if (includesAny(["gender", "sex"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-gender",
      label: "Gender question",
      type: "radio",
      hint: "Choose one demographic category.",
      options: ["Female", "Male", "Prefer not to say"],
      reason: "Gender is usually a single-choice response.",
      settings: ["3 options", "Disaggregation ready"],
    });
  }

  if (includesAny(["consent", "agree", "permission", "participate"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-consent",
      label: "Consent question",
      type: "radio",
      hint: "Confirm respondent consent before continuing.",
      required: true,
      options: ["Yes", "No"],
      reason: "Consent should be explicit and required.",
      settings: ["Required", "Yes / No", "Logic ready"],
    });
  }

  if (
    includesAny([
      "district",
      "region",
      "community",
      "village",
      "country",
      "facility",
      "school",
    ])
  ) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-reference-location",
      label: "Controlled location list",
      type: "dropdown",
      hint: "Bind this to official reference data after adding.",
      required: true,
      reason: "Locations should use controlled reference lists.",
      settings: ["Dropdown", "Reference data suggested"],
    });
  }

  if (includesAny(["gps", "coordinates", "geolocation", "location point"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-gps",
      label: "GPS location",
      type: "gps",
      hint: "Capture field coordinates with accuracy control.",
      required: true,
      validation: { accuracyMax: 25 },
      reason: "This question asks for field location evidence.",
      settings: ["Required", "Accuracy <= 25m"],
    });
  }

  if (includesAny(["photo", "picture", "image", "evidence"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-photo",
      label: "Photo evidence",
      type: "image",
      hint: "Capture or upload proof from the field.",
      reason: "Evidence questions usually need image capture.",
      settings: ["Media upload", "Offline retry ready"],
    });
  }

  if (includesAny(["signature", "sign"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-signature",
      label: "Signature",
      type: "signature",
      hint: "Capture respondent acknowledgement.",
      reason: "Signature questions need a signature capture field.",
      settings: ["Consent proof", "Attachment ready"],
    });
  }

  if (includesAny(["phone", "mobile", "telephone", "contact number"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-phone",
      label: "Phone number",
      type: "phone",
      hint: "Enter a valid phone number.",
      validation: { pattern: "^[0-9+\\-\\s()]{7,}$" },
      reason: "Phone numbers need phone formatting validation.",
      settings: ["Phone format", "Validation ready"],
    });
  }

  if (includesAny(["email", "e-mail"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-email",
      label: "Email address",
      type: "email",
      hint: "Enter a valid email address.",
      validation: { pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
      reason: "Email questions should validate email format.",
      settings: ["Email format", "Validation ready"],
    });
  }

  if (includesAny(["date", "birthday", "birth date", "when"])) {
    suggestions.push({
      confidence: "Good option",
      id: "inferred-date",
      label: "Date",
      type: "date",
      hint: "Select a date.",
      reason: "This question appears to ask for a date.",
      settings: ["Calendar input", "Mobile friendly"],
    });
  }

  if (
    includesAny([
      "amount",
      "cost",
      "price",
      "income",
      "budget",
      "money",
      "currency",
    ])
  ) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-currency",
      label: "Currency amount",
      type: "currency",
      hint: "Enter a money amount.",
      validation: { min: 0 },
      reason: "Money questions should use a currency field.",
      settings: ["Min 0", "Numeric validation"],
    });
  }

  if (includesAny(["how many", "count", "number of", "quantity", "total"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-count",
      label: "Number",
      type: "number",
      hint: "Enter a count or quantity.",
      validation: { min: 0 },
      reason: "Counts should be numeric.",
      settings: ["Min 0", "Numeric validation"],
    });
  }

  if (includesAny(["score", "rating", "satisfaction", "quality level"])) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-rating",
      label: "Rating",
      type: "rating",
      hint: "Select a score or rating.",
      validation: { min: 1, max: 5 },
      reason: "Scores work best as rating fields.",
      settings: ["1 to 5", "Quality scoring ready"],
    });
  }

  if (
    includesAny([
      "list all",
      "household members",
      "children",
      "assets",
      "repeat",
      "each member",
    ])
  ) {
    suggestions.push({
      confidence: "Best match",
      id: "inferred-repeat-group",
      label: "Repeat group",
      type: "repeat_group",
      hint: "Collect the same questions for multiple records.",
      reason: "This sounds like a roster or repeating list.",
      repeat: { min: 0, max: 20 },
      settings: ["Repeatable", "Max 20 records"],
    });
  }

  if (/^(is|are|do|does|did|has|have|can|will|was|were)\b/.test(normalized)) {
    suggestions.push({
      confidence: suggestions.length ? "Good option" : "Best match",
      id: "inferred-yes-no",
      label: "Yes / No",
      type: "radio",
      hint: "Choose one response.",
      options: ["Yes", "No"],
      reason: "This question reads like a confirmation question.",
      settings: ["Yes / No", "Logic ready"],
    });
  }

  if (
    includesAny(["describe", "explain", "comments", "notes", "details", "why"])
  ) {
    suggestions.push({
      confidence: suggestions.length ? "Alternative" : "Best match",
      id: "inferred-long-text",
      label: "Long answer",
      type: "textarea",
      hint: "Enter detailed notes.",
      reason: "Open-ended questions need space for longer answers.",
      settings: ["Long text", "Enumerator notes"],
    });
  }

  suggestions.push({
    confidence: suggestions.length ? "Alternative" : "Best match",
    id: "inferred-short-text",
    label: "Short answer",
    type: "text",
    hint: "Enter a short response.",
    reason: "Safe default for open text responses.",
    settings: ["Short text", "Auto variable name"],
  });

  return addDefaults(suggestions);
}
