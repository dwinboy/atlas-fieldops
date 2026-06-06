import type { MobileQuestion, MobileQuestionType } from "@/models/contracts";

export type QuestionRenderModel = {
  component:
    | "TextQuestion"
    | "NumberQuestion"
    | "SelectQuestion"
    | "GPSQuestion"
    | "MediaQuestion"
    | "RepeatGroupRenderer"
    | "CalculatedQuestion"
    | "MatrixQuestion"
    | "RankingQuestion"
    | "ScannerQuestion"
    | "UnsupportedQuestion";
  question: MobileQuestion;
};

const renderMap: Record<MobileQuestionType, QuestionRenderModel["component"]> = {
  Audio: "MediaQuestion",
  Barcode: "ScannerQuestion",
  CalculatedField: "CalculatedQuestion",
  Consent: "SelectQuestion",
  Currency: "NumberQuestion",
  Date: "TextQuestion",
  DateTime: "TextQuestion",
  Decimal: "NumberQuestion",
  Dropdown: "SelectQuestion",
  FileUpload: "MediaQuestion",
  GPS: "GPSQuestion",
  LongText: "TextQuestion",
  MultiSelect: "SelectQuestion",
  Number: "NumberQuestion",
  Photo: "MediaQuestion",
  QRCode: "ScannerQuestion",
  RepeatGroup: "RepeatGroupRenderer",
  Matrix: "MatrixQuestion",
  Ranking: "RankingQuestion",
  Signature: "MediaQuestion",
  SingleSelect: "SelectQuestion",
  Text: "TextQuestion",
  Time: "TextQuestion",
  Video: "MediaQuestion",
};

export function getQuestionRenderModel(question: MobileQuestion): QuestionRenderModel {
  return {
    component: renderMap[question.type] ?? "UnsupportedQuestion",
    question,
  };
}
