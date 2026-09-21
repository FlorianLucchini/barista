/**
 * Directory names that never contain sources worth analysing.
 *
 * Matched per path segment, never as a substring: `src/buildings/House.java` is
 * a real source tree, and a `path.includes('build')` check would silently
 * delete it.
 */
const EXCLUDED_DIRECTORY_SEGMENTS: ReadonlySet<string> = new Set([
  'build',
  'target',
  'out',
  'bin',
  '.git',
  'node_modules',
  '__MACOSX',
]);

/**
 * Java files that compile but declare no type.
 *
 * `package-info.java` carries package-level annotations and javadoc;
 * `module-info.java` carries the JPMS module descriptor. Neither can contribute
 * a node to a class diagram, so dropping them here spares every later stage
 * from handling a parsed file that yields nothing.
 */
const TYPELESS_SOURCE_FILES: ReadonlySet<string> = new Set([
  'package-info.java',
  'module-info.java',
]);

const JAVA_EXTENSION = 'java';

function isDirectoryEntry(path: string): boolean {
  return path.endsWith('/');
}

function fileNameOf(path: string): string {
  const lastSeparator = path.lastIndexOf('/');
  return lastSeparator === -1 ? path : path.slice(lastSeparator + 1);
}

function directorySegmentsOf(path: string): readonly string[] {
  return path.split('/').slice(0, -1);
}

/**
 * The final extension, lowercased, or `null` when there is none.
 *
 * A leading dot does not start an extension, so `.DS_Store` has none — which is
 * exactly why it never reaches the diagram.
 */
function extensionOf(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0) return null;
  return fileName.slice(lastDot + 1).toLowerCase();
}

function livesInExcludedDirectory(path: string): boolean {
  return directorySegmentsOf(path).some((segment) => EXCLUDED_DIRECTORY_SEGMENTS.has(segment));
}

function declaresNoType(fileName: string): boolean {
  return TYPELESS_SOURCE_FILES.has(fileName.toLowerCase());
}

/**
 * macOS resource forks, which shadow a real file under the same name prefixed
 * with `._`.
 *
 * These usually arrive inside `__MACOSX/`, but a round trip through another
 * platform's archiver leaves them inline next to the source they shadow. They
 * keep the `.java` extension while holding binary AppleDouble data, so the
 * extension check alone would wave them through to the parser.
 */
function isAppleDoubleSidecar(fileName: string): boolean {
  return fileName.startsWith('._');
}

function isAnalysableJavaSource(path: string): boolean {
  if (isDirectoryEntry(path)) return false;
  if (livesInExcludedDirectory(path)) return false;

  const fileName = fileNameOf(path);
  if (isAppleDoubleSidecar(fileName)) return false;
  if (extensionOf(fileName) !== JAVA_EXTENSION) return false;

  return !declaresNoType(fileName);
}

/**
 * Narrows the entries of an uploaded archive down to the Java sources worth
 * analysing, preserving the original order.
 *
 * Everything else is discarded: compiled output, resources, build directories,
 * archive metadata, and the two Java files that declare no type. The filter is
 * purely lexical — it inspects paths, never file contents — so it is safe to
 * run before anything has been decompressed.
 *
 * @param paths Entry paths as they appear in the archive, separated by `/`.
 * @returns The subset that should be handed to the parser.
 */
export function selectJavaSources(paths: readonly string[]): readonly string[] {
  return paths.filter(isAnalysableJavaSource);
}
