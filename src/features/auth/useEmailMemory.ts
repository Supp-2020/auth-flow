// Preserve the typed email between login/signup/forgot-password (email only, never passwords).
let remembered = ''
export const emailMemory = { get: () => remembered, set: (v: string) => { remembered = v } }
