const DATE_INPUT_PREFIX_LENGTH = 10;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}/;

export function toDateInputValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!DATE_INPUT_PATTERN.test(value)) {
    return value;
  }

  return value.slice(0, DATE_INPUT_PREFIX_LENGTH);
}
