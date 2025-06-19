// validation.js
const TASK_REQUIRED_FIELDS = {
  // 共通の必須項目
  common: ['title', 'taskType', 'repeatType', 'startDate'],
  // 繰り返しタイプごとの必須項目
  byRepeatType: {
    interval: ['interval'],   //日数ごと
    weekday: ['weekdays'],    // 曜日ごと
    monthday: ['monthdays'],  // 日付ごと
    once: ['nextDate']        // 一度きり
  }
};

function validateTaskFields(body) {
  const { repeatType } = body;
  const common = TASK_REQUIRED_FIELDS.common;
  const byType = TASK_REQUIRED_FIELDS.byRepeatType[repeatType] || [];

  for (const f of common) {
    const value = body[f];
    if (!value) {
      return `${f}は必須です`;
    }
  }
  for (const f of byType) {
    const value = body[f];
    if (!value) {
      return `${f}は必須です（${repeatType}）`;
    }
  }
  return null;
}

// validateRequiredFields: 必須項目のバリデーションを行う共通関数
// body: リクエストボディ, repeatType: リピートタイプ, requiredFields: 必須フィールド定義
function validateRequiredFields(body, repeatType, requiredFields) {
  const common = requiredFields.common;
  const byType = requiredFields.byRepeatType[repeatType] || [];
  for (const f of common) {
    if (!body[f]) {
      return `${f}は必須です`;
    }
  }
  for (const f of byType) {
    if (!body[f]) {
      return `${f}は必須です（${repeatType}）`;
    }
  }
  return null;
}

module.exports = {
  TASK_REQUIRED_FIELDS,
  validateTaskFields,
  validateRequiredFields
};
