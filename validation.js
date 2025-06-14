// validation.js
const TASK_REQUIRED_FIELDS = {
  common: ['title', 'taskType', 'repeatType', 'startDate'],
  byRepeatType: {
    interval: ['interval'],
    weekday: ['weekdays'],
    monthday: ['monthdays'],
    once: ['nextDate']
  }
};

function validateTaskFields(body) {
  const { repeatType } = body;
  const common = TASK_REQUIRED_FIELDS.common;
  const byType = TASK_REQUIRED_FIELDS.byRepeatType[repeatType] || [];
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
  validateTaskFields
};
