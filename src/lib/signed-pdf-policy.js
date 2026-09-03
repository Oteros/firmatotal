export function authorizeVisualRewrite({ hasSignatures, hasVisualChanges }, confirmInvalidation) {
  if (!hasSignatures || !hasVisualChanges) {
    return { allowed: true, allowSignedPdfRewrite: false };
  }

  return {
    allowed: Boolean(confirmInvalidation()),
    allowSignedPdfRewrite: true,
  };
}
