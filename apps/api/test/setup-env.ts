// Keeps recording-upload e2e tests fast: the production default
// (recordings.constants.ts) is 500 MB, which is impractical to allocate
// per test run just to exercise the "oversized file" rejection path.
process.env.RECORDING_MAX_SIZE_BYTES ??= String(1024 * 1024);
