export function canSubmitSaveFooter(input: {
  dirty: boolean;
  valid: boolean;
  saving: boolean;
}): boolean {
  return input.dirty && input.valid && !input.saving;
}
