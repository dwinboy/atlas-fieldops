import { isCascadeBlocked, resolveQuestionOptions } from "@/forms/optionResolver";
import type { MobileFormVersion, MobileQuestion, MobileReferenceList, MobileSubmission, MobileValidationRule } from "@/models/contracts";
import { evaluateQuestionLogicStates, LogicEngine } from "@/forms/logicEngine";

export type FormValidationIssue = {
  questionId: string;
  label: string;
  message: string;
  fixHint?: string;
  severity: "Error" | "Warning";
};

export class FormValidationService {
  validate(formVersion: MobileFormVersion, draft: MobileSubmission, referenceLists: MobileReferenceList[] = []): FormValidationIssue[] {
    const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
    const logicState = new LogicEngine().evaluate(formVersion, draft);
    const issues: FormValidationIssue[] = [];
    for (const section of formVersion.sections) {
      for (const question of section.questions) {
        const state = logicState[question.id];
        if (state?.visible === false || question.type === "Hidden") {
          continue;
        }
        const value = responses.get(question.id);
        const required = Boolean(state?.required);
        const missing = this.isMissing(value, question.type);
        if (required && missing) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "This required question must be answered before submit.",
            fixHint: question.mobileControls?.blockedHelp
              ? "Follow the field guidance shown for this question. If the answer is not available, ask your supervisor how this form should handle it."
              : undefined,
            severity: "Error",
          });
          continue;
        }
        if (question.privacyControls?.consentRequired && missing) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "Consent must be captured before this answer can be submitted.",
            fixHint: "Confirm consent with the respondent, then capture the configured consent answer. If consent is refused, follow the form instructions.",
            severity: "Error",
          });
          continue;
        }
        if (question.qualityControls?.captureGps && !this.hasUsableGps(draft)) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "GPS evidence is required for this record.",
            fixHint: "Move to an open area, capture GPS on the GPS question, then review the record again.",
            severity: question.qualityControls.integrityAction === "block_submission" ? "Error" : "Warning",
          });
        }
        if (question.qualityControls?.photoEvidence && missing) {
          issues.push({
            questionId: question.id,
            label: question.label,
            message: question.mobileControls?.blockedHelp ?? "Photo evidence is expected for this question.",
            fixHint: "Capture the required photo or ask your supervisor whether this evidence can be returned later.",
            severity: question.qualityControls.integrityAction === "block_submission" ? "Error" : "Warning",
          });
        }
        if (missing) {
          continue;
        }
        if (question.governanceControls?.changeReasonRequired && prefilledValueChanged(question, value)) {
          const reasonValue = responses.get(changeReasonQuestionId(question.id));
          if (this.isMissing(reasonValue, "Text")) {
            issues.push({
              questionId: question.id,
              label: question.label,
              message: "Explain why this prefilled value changed before submitting.",
              fixHint: "Add a short reason in the change-reason box under this question so reviewers can trace the profile update.",
              severity: "Error",
            });
            continue;
          }
        }
        issues.push(...this.validateValue(question, value, { responses, referenceLists }));
      }
    }
    return issues;
  }

  validateRequired(formVersion: MobileFormVersion, draft: MobileSubmission, referenceLists: MobileReferenceList[] = []): FormValidationIssue[] {
    return this.validate(formVersion, draft, referenceLists).filter((issue) => issue.message.includes("required"));
  }

  private isMissing(value: unknown, questionType: MobileQuestion["type"]): boolean {
    if (questionType === "RepeatGroup" || questionType === "Ranking" || questionType === "MultiSelect") {
      return !Array.isArray(value) || value.length === 0;
    }
    if (questionType === "Matrix") {
      return !hasMeaningfulMatrixAnswers(value);
    }
    if (questionType === "Polygon") {
      if (!value || typeof value !== "object" || Array.isArray(value)) return true;
      const polygon = value as { type?: unknown; coordinates?: unknown };
      if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates)) return true;
      const ring = polygon.coordinates[0];
      return !Array.isArray(ring) || ring.length < 4;
    }
    if (questionType === "GPS") {
      if (!value || typeof value !== "object" || Array.isArray(value)) return true;
      const gps = value as { latitude?: unknown; longitude?: unknown };
      return !Number.isFinite(Number(gps.latitude)) || !Number.isFinite(Number(gps.longitude));
    }
    if (questionType === "Photo" || questionType === "Video") {
      if (typeof value === "string") return value.trim().length === 0;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const reference = (value as { uri?: unknown; localUri?: unknown; reference?: unknown }).uri
          ?? (value as { localUri?: unknown }).localUri
          ?? (value as { reference?: unknown }).reference;
        return String(reference ?? "").trim().length === 0;
      }
    }
    if (questionType === "Audio" || questionType === "FileUpload" || questionType === "Signature") {
      if (typeof value === "string") return value.trim().length === 0;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const reference = (value as { reference?: unknown; uri?: unknown; localUri?: unknown }).reference
          ?? (value as { uri?: unknown }).uri
          ?? (value as { localUri?: unknown }).localUri;
        return String(reference ?? "").trim().length === 0;
      }
    }
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  private hasUsableGps(draft: MobileSubmission): boolean {
    if (draft.location?.latitude !== null && draft.location?.longitude !== null) {
      return true;
    }
    return draft.responses.some((response) => {
      const value = response.value;
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const candidate = value as { type?: unknown; latitude?: unknown; longitude?: unknown; coordinates?: unknown };
      if (candidate.type === "Polygon" && Array.isArray(candidate.coordinates)) {
        const ring = candidate.coordinates[0];
        const firstVertex = Array.isArray(ring) ? ring[0] : null;
        return (
          Array.isArray(firstVertex) &&
          Number.isFinite(Number(firstVertex[0])) &&
          Number.isFinite(Number(firstVertex[1]))
        );
      }
      return Number.isFinite(Number(candidate.latitude)) && Number.isFinite(Number(candidate.longitude));
    });
  }

  private validateValue(
    question: MobileQuestion,
    value: unknown,
    context: { responses: Map<string, unknown>; referenceLists: MobileReferenceList[] },
  ): FormValidationIssue[] {
    const issues: FormValidationIssue[] = [];
    // "Warn instead of block": the builder can make this question's value rules advisory — they
    // surface as warnings the officer can proceed past, rather than hard errors.
    const warnOnly = question.metadataTags?.includes("validation-warn-only") ?? false;
    const addIssue = (message: string, severity: "Error" | "Warning" = "Error", fixHint?: string) => {
      issues.push({
        questionId: question.id,
        label: question.label,
        message: question.mobileControls?.blockedHelp ?? message,
        fixHint: question.mobileControls?.blockedHelp ? `${fixHint ?? ""} ${question.mobileControls.blockedHelp}`.trim() : fixHint,
        severity: warnOnly && severity === "Error" ? "Warning" : severity,
      });
    };

    if (["Number", "Decimal", "Currency"].includes(question.type)) {
      const numeric = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(numeric)) {
        addIssue("Enter a valid number.", "Error", "Use digits only. If the answer is unknown, choose a configured 'Don't know' option instead of typing text.");
        return issues;
      }
      if (hasCustomRule(question, "integerOnly:true") && !Number.isInteger(numeric)) {
        addIssue("Enter a whole number without decimals.", "Error", "Use a count such as 1, 2, or 10. Do not enter 1.5 for this question.");
      }
      const decimalPlaces = customRuleNumber(question, "decimalPlaces");
      if (decimalPlaces !== null) {
        const decimals = (String(value).split(".")[1] ?? "").replace(/[^0-9]/g, "").length;
        if (decimals > decimalPlaces) {
          addIssue(`Use at most ${decimalPlaces} decimal place(s).`, "Error", `Round the value to ${decimalPlaces} decimal place(s).`);
        }
      }
      for (const rule of question.validationRules) {
        if (rule.ruleType === "Min" && typeof rule.value === "number" && numeric < rule.value) {
          addIssue(rule.message || `Value must be at least ${rule.value}.`, rule.severity === "Warning" ? "Warning" : "Error", `Enter a value from ${rule.value} upward, or ask your supervisor if the form limit is wrong.`);
        }
        if (rule.ruleType === "Max" && typeof rule.value === "number" && numeric > rule.value) {
          addIssue(rule.message || `Value must be at most ${rule.value}.`, rule.severity === "Warning" ? "Warning" : "Error", `Enter a value of ${rule.value} or lower, or ask your supervisor if the limit should be changed.`);
        }
      }
    }

    if (question.type === "MultiSelect" && Array.isArray(value)) {
      const minSelections = customRuleNumber(question, "minSelections");
      const maxSelections = customRuleNumber(question, "maxSelections");
      if (minSelections !== null && value.length > 0 && value.length < minSelections) {
        addIssue(`Select at least ${minSelections} option(s).`, "Error", `Choose ${minSelections} or more options for this question.`);
      }
      if (maxSelections !== null && value.length > maxSelections) {
        addIssue(`Select at most ${maxSelections} option(s).`, "Error", `Remove some choices so no more than ${maxSelections} are selected.`);
      }
    }

    if (question.type === "Date" || question.type === "DateTime") {
      const parsed = parseFieldDate(String(value), question.type);
      if (!parsed) {
        addIssue(question.type === "DateTime"
          ? "Enter a valid date and time using YYYY-MM-DD HH:MM, for example 2026-06-08 14:30."
          : "Enter a valid date using YYYY-MM-DD, for example 2026-06-08. You can type DD/MM/YYYY and the app will convert it.",
          "Error",
          question.type === "DateTime" ? "Use the date buttons when possible, or type 2026-06-08 14:30." : "Use the 'Use today' button when the date is today, or type the date as 2026-06-08.");
        return issues;
      }
      const blockFutureDates = hasCustomRule(question, "blockFutureDates:true");
      const blockPastDates = hasCustomRule(question, "blockPastDates:true");
      const minDate = customRuleDate(question, "minDate");
      const maxDate = customRuleDate(question, "maxDate");
      if (minDate && parsed.getTime() < minDate.getTime()) {
        addIssue(`Date must be on or after ${formatRuleDate(minDate)}.`, "Error", "Choose a date inside the allowed range for this question.");
      }
      if (maxDate && parsed.getTime() > maxDate.getTime()) {
        addIssue(`Date must be on or before ${formatRuleDate(maxDate)}.`, "Error", "Choose a date inside the allowed range for this question.");
      }
      if (blockFutureDates && parsed.getTime() > Date.now()) {
        addIssue("Date cannot be in the future.", "Error", "Enter the date when the event already happened. If this is meant to be a planned future date, ask your manager to allow future dates for this question.");
      }
      if (blockPastDates && parsed.toDateString() !== new Date().toDateString() && parsed.getTime() < Date.now()) {
        addIssue("Date cannot be in the past.", "Error", "Enter today or a future date, or ask your manager to change the date rule for this question.");
      }
    }

    if (question.type === "Time") {
      const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value).trim());
      if (!valid) {
        addIssue("Enter a valid 24-hour time using HH:MM, for example 14:30.", "Error", "Use the 'Use current time' button or type time like 09:15 or 16:45.");
      }
    }

    if (question.type === "Rating") {
      const numeric = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
        addIssue("Choose a rating from 1 to 5 stars.", "Error", "Tap one of the stars shown for this question. Tap the selected star again if you need to clear it.");
      }
    }

    if (question.type === "Nps") {
      const numeric = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 0 || numeric > 10) {
        addIssue("Choose a score from 0 to 10.", "Error", "Tap one of the score buttons shown for this question. Tap the selected score again if you need to clear it.");
      }
    }

    if (question.type === "Consent") {
      const consentGiven = value === true || String(value).trim().toLowerCase() === "true";
      if (hasCustomRule(question, "blockIfFalse:true") && !consentGiven) {
        addIssue(
          "Consent is required before continuing.",
          "Error",
          "If the respondent does not consent, stop this interview and follow your program guidance instead of submitting the record.",
        );
      }
    }

    if (["Text", "LongText", "Barcode", "QRCode", "Consent"].includes(question.type)) {
      const text = String(value);
      const trimmedText = text.trim();
      if (trimmedText && (question.type === "Text" || question.type === "LongText")) {
        if (question.inputMode === "email" && !isValidEmail(trimmedText)) {
          addIssue("Enter a valid email address.", "Error", "Use a full email address like name@example.org.");
        }
        if (question.inputMode === "phone" && !isValidPhone(trimmedText)) {
          addIssue("Enter a valid phone number.", "Error", "Use digits with an optional country code, for example +237 677 000 000.");
        }
        if (question.inputMode === "url" && !isValidUrl(trimmedText)) {
          addIssue("Enter a valid website address.", "Error", "Use a full link like https://example.org or www.example.org.");
        }
      }
      for (const rule of question.validationRules) {
        if (rule.ruleType === "MinLength" && typeof rule.value === "number" && text.length < rule.value) {
          addIssue(rule.message || `Answer must have at least ${rule.value} characters.`, rule.severity === "Warning" ? "Warning" : "Error", "Add more detail so the reviewer can understand this answer.");
        }
        if (rule.ruleType === "MaxLength" && typeof rule.value === "number" && text.length > rule.value) {
          addIssue(rule.message || `Answer must have at most ${rule.value} characters.`, rule.severity === "Warning" ? "Warning" : "Error", "Shorten the answer or move long notes to a comments question if available.");
        }
        if (rule.ruleType === "Regex" && typeof rule.value === "string" && rule.value) {
          try {
            if (!new RegExp(rule.value).test(text)) {
              addIssue(rule.message || "Answer format is not valid.", rule.severity === "Warning" ? "Warning" : "Error", "Check spelling, spacing, symbols, and the required format shown by your supervisor.");
            }
          } catch {
            addIssue("This question has an invalid validation pattern. Sync the form again.", "Warning", "Pull down to sync assigned work. If it remains, ask your manager to fix the web form validation rule.");
          }
        }
      }
    }

    if (["SingleSelect", "Dropdown"].includes(question.type)) {
      const resolvedOptions =
        isCascadeBlocked(question, context.responses)
          ? []
          : resolveQuestionOptions(question, context.responses, context.referenceLists);
      const allowed = new Set(resolvedOptions.map((option) => option.value));
      if (!allowed.has(String(value))) {
        addIssue("Select one of the approved options.", "Error", "Clear the answer and choose one of the visible options. If the right option is missing, ask your manager to update the reference list.");
      }
    }

    if (question.type === "MultiSelect") {
      const resolvedOptions =
        isCascadeBlocked(question, context.responses)
          ? []
          : resolveQuestionOptions(question, context.responses, context.referenceLists);
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      const allowed = new Set(resolvedOptions.map((option) => option.value));
      const invalid = values.filter((item) => !allowed.has(item));
      if (invalid.length) {
        addIssue("Remove choices that are not in the approved option list.", "Error", "Remove invalid choices and select only the options shown on the screen.");
      }
    }

    if (question.type === "Ranking") {
      const rankingOptions =
        isCascadeBlocked(question, context.responses)
          ? []
          : resolveQuestionOptions(question, context.responses, context.referenceLists);
      const values = Array.isArray(value) ? value.map(String) : [];
      const allowed = new Set(rankingOptions.map((option) => option.value));
      const invalid = values.filter((item) => !allowed.has(item));
      const duplicates = values.filter((item, index) => values.indexOf(item) !== index);
      if (invalid.length) {
        addIssue("Ranking includes a choice that is not in the approved option list.", "Error", "Remove the invalid ranked item and select from the available choices.");
      }
        if (duplicates.length) {
          addIssue("Each ranked choice can only appear once.", "Error", "Remove duplicate ranked choices. Each option should appear once in the final order.");
        }
    }

    if (["Photo", "Video", "Audio", "FileUpload", "Signature"].includes(question.type)) {
      const mediaItems = mediaItemsFromValue(value);
      const maxAttachmentRule = customRule(question, "maxAttachmentCount");
      const maxAttachmentCount = customRuleNumber(question, "maxAttachmentCount");
      if (maxAttachmentCount !== null && mediaItems.length > maxAttachmentCount) {
        addIssue(
          maxAttachmentRule?.message || `Only ${maxAttachmentCount} attachment(s) are allowed for this question.`,
          ruleSeverity(maxAttachmentRule),
          "Remove extra attachments or ask your manager to increase the allowed attachment count for this question.",
        );
      }

      const maxFileSizeRule = customRule(question, "maxFileSizeMb");
      const maxFileSizeMb = customRuleNumber(question, "maxFileSizeMb");
      if (
        maxFileSizeMb !== null &&
        mediaItems.some((item) => {
          const size = mediaItemSize(item);
          return size !== null && size > maxFileSizeMb * 1024 * 1024;
        })
      ) {
        addIssue(
          maxFileSizeRule?.message || `Attachment size must be ${maxFileSizeMb} MB or smaller.`,
          ruleSeverity(maxFileSizeRule),
          "Retake, compress, or replace the file with a smaller version before syncing this form.",
        );
      }

      const allowedTypesRule = customRule(question, "allowedFileTypes");
      const allowedTypes = mediaAllowedTokens(customRuleString(question, "allowedFileTypes"));
      if (
        allowedTypes.length > 0 &&
        mediaItems.some((item) => {
          const itemType = mediaItemType(item);
          return itemType.length > 0 && !allowedTypes.some((token) => itemType.includes(token));
        })
      ) {
        addIssue(
          allowedTypesRule?.message || "This attachment type is not allowed for this question.",
          ruleSeverity(allowedTypesRule),
          `Use one of the approved file types: ${allowedTypes.join(", ")}.`,
        );
      }
    }

    if (question.type === "RepeatGroup") {
      const rows = Array.isArray(value) ? value : [];
      const minRepeats = question.repeatSettings?.minRepeats ?? null;
      const maxRepeats = question.repeatSettings?.maxRepeats ?? null;
      if (minRepeats !== null && rows.length < minRepeats) {
        addIssue(`Add at least ${minRepeats} row(s).`, "Error", "Tap 'Add row' and complete one row for each repeated item required by the form.");
      }
      if (maxRepeats !== null && rows.length > maxRepeats) {
        addIssue(`Remove extra rows. Maximum allowed is ${maxRepeats}.`, "Error", "Remove extra rows or ask your supervisor to increase the repeat limit in the web form.");
      }
      const childQuestions = repeatGroupFields(question);
      rows.forEach((rowValue, rowIndex) => {
        const row = rowValue && typeof rowValue === "object" && !Array.isArray(rowValue)
          ? rowValue as Record<string, unknown>
          : {};
        const rowResponses = new Map(Object.entries(row));
        const rowLogic = evaluateQuestionLogicStates(childQuestions, rowResponses);
        for (const child of childQuestions) {
          if (rowLogic[child.id]?.visible === false) {
            continue;
          }
          const childValue = row[child.id] ?? row[child.variableName];
          const childMissing = this.isMissing(childValue, child.type);
          const rowLabel = `${question.label} row ${rowIndex + 1} · ${child.label}`;
          const rowRequired = Boolean(rowLogic[child.id]?.required);
          if (rowRequired && childMissing) {
            issues.push({
              questionId: question.id,
              label: rowLabel,
              message: child.mobileControls?.blockedHelp ?? `${rowLabel} is required.`,
              fixHint: child.mobileControls?.blockedHelp
                ? "Follow the field guidance shown for this row. If the answer is not available, ask your supervisor how this form should handle it."
                : "Complete the missing row answer before submitting this repeated section.",
              severity: "Error",
            });
            continue;
          }
          if (child.privacyControls?.consentRequired && childMissing) {
            issues.push({
              questionId: question.id,
              label: rowLabel,
              message: child.mobileControls?.blockedHelp ?? `${rowLabel} requires consent before it can be submitted.`,
              fixHint: "Confirm consent for this repeated record, then capture the configured consent answer. If consent is refused, follow your program guidance.",
              severity: "Error",
            });
            continue;
          }
          if (child.qualityControls?.captureGps && childMissing) {
            issues.push({
              questionId: question.id,
              label: rowLabel,
              message: child.mobileControls?.blockedHelp ?? `${rowLabel} requires GPS evidence.`,
              fixHint: "Capture GPS for this repeated row, or move to an open area and try again.",
              severity: child.qualityControls.integrityAction === "block_submission" ? "Error" : "Warning",
            });
            continue;
          }
          if (child.qualityControls?.photoEvidence && childMissing) {
            issues.push({
              questionId: question.id,
              label: rowLabel,
              message: child.mobileControls?.blockedHelp ?? `${rowLabel} requires evidence before it can be submitted.`,
              fixHint: "Capture the required photo, video, audio, file, or signature for this repeated row.",
              severity: child.qualityControls.integrityAction === "block_submission" ? "Error" : "Warning",
            });
            continue;
          }
          if (childMissing) {
            continue;
          }
          for (const childIssue of this.validateValue(child, childValue, {
            responses: rowResponses,
            referenceLists: context.referenceLists,
          })) {
            issues.push({
              ...childIssue,
              questionId: question.id,
              label: rowLabel,
              message: `${rowLabel}: ${childIssue.message}`,
            });
          }
        }
      });
    }

    if (question.type === "Matrix") {
      const matrix = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
      const rows = matrixRows(question);
      const allowed = new Set(matrixColumns(question));
      const multi = matrixAllowsMultiple(question);
      for (const row of rows) {
        const rowValue = matrix[row.value];
        const rowMissing =
          rowValue === null ||
          rowValue === undefined ||
          rowValue === "" ||
          (Array.isArray(rowValue) && rowValue.length === 0);
        if (question.required && rowMissing) {
          addIssue(`Complete the matrix row "${row.label}".`, "Error", "Review each matrix row and choose the expected response before submitting.");
          continue;
        }
        if (rowMissing || allowed.size === 0) {
          continue;
        }
        const values = Array.isArray(rowValue) ? rowValue.map(String) : [String(rowValue)];
        const invalid = values.filter((item) => !allowed.has(item));
        if (invalid.length > 0) {
          addIssue(`Use one of the approved choices for matrix row "${row.label}".`, "Error", "Clear the invalid matrix answer and pick from the visible row choices.");
        }
        if (!multi && values.length > 1) {
          addIssue(`Choose only one answer for matrix row "${row.label}".`, "Error", "Clear extra choices so the row has just one response.");
        }
      }
    }

    if (question.type === "Polygon" && typeof value === "object" && value !== null && !Array.isArray(value)) {
      const polygon = value as { type?: unknown; coordinates?: unknown };
      const ring = polygon.type === "Polygon" && Array.isArray(polygon.coordinates) ? polygon.coordinates[0] : null;
      if (!Array.isArray(ring)) {
        addIssue("Draw a boundary on the map.", "Error", "Tap 'Draw boundary' and add at least 3 points, then tap 'Done' to close the shape.");
        return issues;
      }

      const minVerticesRule = question.validationRules.find((rule) => rule.ruleType === "Custom" && typeof rule.value === "string" && rule.value.startsWith("minVertices:"));
      const minVertices = typeof minVerticesRule?.value === "string" ? Number(minVerticesRule.value.replace("minVertices:", "")) : 3;
      const vertexCount = Math.max(0, ring.length - 1);
      if (Number.isFinite(minVertices) && vertexCount < minVertices) {
        addIssue(minVerticesRule?.message || `Draw a boundary with at least ${minVertices} points.`, minVerticesRule?.severity === "Warning" ? "Warning" : "Error", "Tap 'Edit boundary' and add more points before closing the shape.");
      }

      const requireClosedRule = question.validationRules.find((rule) => rule.ruleType === "Custom" && rule.value === "requireClosed:true");
      if (requireClosedRule) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        const isClosed = Array.isArray(first) && Array.isArray(last) && first[0] === last[0] && first[1] === last[1];
        if (!isClosed) {
          addIssue(requireClosedRule.message || "The boundary must form a closed shape.", requireClosedRule.severity === "Warning" ? "Warning" : "Error", "Tap 'Edit boundary' and tap 'Done' to connect the last point back to the first.");
        }
      }
    }

    if (question.type === "GPS" && typeof value === "object" && value !== null) {
      const gps = value as { accuracy?: unknown; latitude?: unknown; longitude?: unknown };
      const latitude = Number(gps.latitude);
      const longitude = Number(gps.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        addIssue("Capture valid GPS coordinates.", "Error", "Tap capture GPS again, stay outside if possible, and wait until the phone reports a location.");
      }
      const accuracyRule = question.validationRules.find((rule) => rule.ruleType === "Custom" && typeof rule.value === "string" && rule.value.startsWith("accuracyMax:"));
      const accuracyValue = typeof accuracyRule?.value === "string" ? accuracyRule.value : null;
      const accuracyLimit = accuracyValue ? Number(accuracyValue.replace("accuracyMax:", "")) : null;
      const accuracy = Number(gps.accuracy);
      if (accuracyLimit !== null && Number.isFinite(accuracy) && accuracy > accuracyLimit) {
        addIssue(accuracyRule?.message || `GPS accuracy must be ${accuracyLimit} meters or better.`, "Error", "Move to an open area and recapture GPS. If the location is correct but accuracy remains poor, add a note if the form allows it.");
      }
    }

    return issues;
  }

  progress(
    formVersion: MobileFormVersion,
    draft: MobileSubmission,
    referenceLists: MobileReferenceList[] = [],
  ): { answered: number; total: number; percent: number } {
    const responses = new Map(draft.responses.map((response) => [response.questionId, response.value]));
    const logicState = new LogicEngine().evaluate(formVersion, draft);
    const blockingQuestions = new Set(
      this.validate(formVersion, draft, referenceLists)
        .filter((issue) => issue.severity === "Error")
        .map((issue) => issue.questionId),
    );
    let total = 0;
    let answered = 0;
    for (const section of formVersion.sections) {
      for (const question of section.questions) {
        const state = logicState[question.id];
        if (state?.visible === false || question.type === "Hidden") {
          continue;
        }
        total += 1;
        const value = responses.get(question.id);
        if (!this.isMissing(value, question.type) && !blockingQuestions.has(question.id)) {
          answered += 1;
        }
      }
    }
    return { answered, total, percent: total === 0 ? 0 : Math.round((answered / total) * 100) };
  }
}

function changeReasonQuestionId(questionId: string): string {
  return `${questionId}__change_reason`;
}

function prefilledValueChanged(question: MobileQuestion, value: unknown): boolean {
  return JSON.stringify(question.defaultValue ?? null) !== JSON.stringify(value ?? null);
}

function hasCustomRule(question: MobileQuestion, value: string): boolean {
  return question.validationRules.some((rule) => rule.ruleType === "Custom" && rule.value === value);
}

function customRule(question: MobileQuestion, prefix: string): MobileValidationRule | null {
  return (
    question.validationRules.find(
      (candidate) =>
        candidate.ruleType === "Custom" &&
        typeof candidate.value === "string" &&
        (candidate.value === prefix || candidate.value.startsWith(`${prefix}:`)),
    ) ?? null
  );
}

function customRuleString(question: MobileQuestion, prefix: string): string | null {
  const rule = customRule(question, prefix);
  if (!rule || typeof rule.value !== "string") return null;
  if (rule.value === prefix) return "";
  return rule.value.slice(prefix.length + 1);
}

function customRuleNumber(question: MobileQuestion, prefix: string): number | null {
  const value = customRuleString(question, prefix);
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function customRuleDate(question: MobileQuestion, prefix: "minDate" | "maxDate"): Date | null {
  const value = customRuleString(question, prefix);
  if (value === null || value === "") return null;
  return parseFieldDate(value, "Date");
}

function formatRuleDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function ruleSeverity(rule: MobileValidationRule | null): "Error" | "Warning" {
  return rule?.severity === "Warning" ? "Warning" : "Error";
}

function mediaItemsFromValue(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value
      .map((item) => (isQuestionRecord(item) ? item : { uri: item }))
      .filter((item) => !isMissingMediaItem(item));
  }
  if (isQuestionRecord(value)) {
    return isMissingMediaItem(value) ? [] : [value];
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [{ uri: value }];
  }
  return [];
}

function isMissingMediaItem(item: Record<string, unknown>): boolean {
  const reference = item.reference ?? item.uri ?? item.localUri ?? item.name ?? item.fileName;
  return String(reference ?? "").trim().length === 0;
}

function mediaAllowedTokens(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,; ]+/)
    .map((token) => token.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

function mediaItemType(item: Record<string, unknown>): string {
  const mimeType = String(item.mimeType ?? item.mime_type ?? item.type ?? "").trim().toLowerCase();
  const fileName = String(item.fileName ?? item.file_name ?? item.name ?? item.reference ?? item.uri ?? "").trim().toLowerCase();
  const extension = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  return `${mimeType} ${extension}`.trim();
}

function mediaItemSize(item: Record<string, unknown>): number | null {
  const value = item.fileSize ?? item.file_size ?? item.size;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function repeatGroupFields(question: MobileQuestion): MobileQuestion[] {
  const metadata = isQuestionRecord(question.defaultValue) ? question.defaultValue : {};
  const rawFields = firstNonEmptyArray(metadata.fields, metadata.questions, metadata.children);
  if (Array.isArray(rawFields) && rawFields.length > 0) {
    return rawFields.filter(
      (field): field is MobileQuestion =>
        isQuestionRecord(field) && typeof field.id === "string" && typeof field.type === "string",
    );
  }
  if (Array.isArray(question.defaultValue) && question.defaultValue.length > 0) {
    return question.defaultValue.filter(
      (field): field is MobileQuestion =>
        isQuestionRecord(field) && typeof field.id === "string" && typeof field.type === "string",
    );
  }
  return [];
}

function matrixAllowsMultiple(question: MobileQuestion): boolean {
  const metadata = isQuestionRecord(question.defaultValue) ? question.defaultValue : {};
  const mode = String(metadata.mode ?? metadata.matrixMode ?? metadata.type ?? "").toLowerCase();
  return (
    mode.includes("multi") ||
    question.validationRules.some(
      (rule) =>
        rule.ruleType === "Custom" &&
        typeof rule.value === "string" &&
        rule.value.toLowerCase() === "matrixmode:multi",
    )
  );
}

function matrixRows(question: MobileQuestion): Array<{ label: string; value: string }> {
  const metadata = isQuestionRecord(question.defaultValue) ? question.defaultValue : {};
  const rows = firstNonEmptyOptionList(
    optionListFromUnknown(metadata.rows, "rows"),
    optionListFromUnknown(metadata.matrixRows, "matrixRows"),
    optionListFromUnknown(metadata.statements, "statements"),
  );
  if (rows.length > 0) {
    return rows;
  }
  return [{ label: question.label, value: question.variableName || question.id }];
}

function matrixColumns(question: MobileQuestion): string[] {
  const metadata = isQuestionRecord(question.defaultValue) ? question.defaultValue : {};
  const options = firstNonEmptyOptionList(
    optionListFromUnknown(metadata.columns, "columns"),
    optionListFromUnknown(metadata.matrixColumns, "matrixColumns"),
    question.options.map((option) => ({
      id: option.id,
      label: option.label,
      value: option.value,
    })),
  );
  if (options.length > 0) {
    return options.map((option) => option.value);
  }
  return ["yes", "no"];
}

function optionListFromUnknown(
  value: unknown,
  fallbackKey: string,
): Array<{ id: string; label: string; value: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item, index) => {
    if (isQuestionRecord(item)) {
      const rawValue = item.value ?? item.id ?? item.name ?? item.label ?? `${fallbackKey}_${index + 1}`;
      return {
        id: String(item.id ?? rawValue),
        label: String(item.label ?? item.name ?? item.text ?? rawValue),
        value: String(rawValue),
      };
    }
    const label = String(item || `${fallbackKey} ${index + 1}`);
    return {
      id: label,
      label,
      value: label,
    };
  });
}

function firstNonEmptyArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }
  return [];
}

function firstNonEmptyOptionList<T>(...lists: T[][]): T[] {
  return lists.find((list) => list.length > 0) ?? [];
}

function isQuestionRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFieldDate(value: string, questionType: MobileQuestion["type"]): Date | null {
  const raw = value.trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return buildStrictDate(Number(year), Number(month), Number(day));
  }

  const dateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?$/);
  if (dateTime && questionType === "DateTime") {
    const [, year, month, day, hour, minute] = dateTime;
    return buildStrictDate(Number(year), Number(month), Number(day), Number(hour), Number(minute));
  }

  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, first, second, year] = slashDate;
    return buildStrictDate(Number(year), Number(second), Number(first));
  }

  const dashDate = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashDate) {
    const [, first, second, year] = dashDate;
    return buildStrictDate(Number(year), Number(second), Number(first));
  }

  const slashDateTime = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (slashDateTime && questionType === "DateTime") {
    const [, day, month, year, hour, minute] = slashDateTime;
    return buildStrictDate(Number(year), Number(month), Number(day), Number(hour), Number(minute));
  }

  const dashDateTime = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (dashDateTime && questionType === "DateTime") {
    const [, day, month, year, hour, minute] = dashDateTime;
    return buildStrictDate(Number(year), Number(month), Number(day), Number(hour), Number(minute));
  }

  return null;
}

function buildStrictDate(year: number, month: number, day: number, hour = 0, minute = 0): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }
  return parsed;
}

function hasMeaningfulMatrixAnswers(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).some((item) => {
    if (item === null || item === undefined || item === "") {
      return false;
    }
    if (Array.isArray(item)) {
      return item.length > 0;
    }
    return true;
  });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  if (!/^[+\d\s\-()]+$/.test(value)) {
    return false;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

function isValidUrl(value: string): boolean {
  try {
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(candidate);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}
