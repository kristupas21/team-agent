export function isRedirectError(err: unknown): boolean {
  return (
    err instanceof Error &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

export function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as { code?: unknown }).code === 11000
}
