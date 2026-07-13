import {
  CATEGORIES,
  REGIONS,
  RESEARCH_SOURCE_TYPES,
  type CountryLimitException,
  type DatasetStage,
  type DatasetValidationProfile,
  type Region,
  type Spot,
  type SpotDatasetManifest,
  type SpotDatasetValidationResult,
} from "./types";

const DATASET_SCHEMA_VERSION = 1;
const MAX_SPOTS_PER_COUNTRY = 5;
const LOCAL_FALLBACK_IMAGE_URL = "/images/spot-fallback.svg";
const WIKIMEDIA_IMAGE_HOST = "upload.wikimedia.org";
const WIKIMEDIA_THUMB_PATH_PREFIX = "/wikipedia/commons/thumb/";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const JAPANESE_TEXT_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

const RELEASE_REGION_COUNTS: Readonly<Record<Region, number>> = {
  asia: 30,
  europe: 50,
  "north-america": 30,
  "latin-america": 30,
  africa: 20,
  "middle-east-central-asia": 20,
  oceania: 20,
};

const SPOT_KEYS = [
  "id",
  "slug",
  "name",
  "internalEnglishName",
  "region",
  "country",
  "city",
  "categories",
  "description",
  "coordinates",
  "googleMapsUrl",
  "accessFromTokyo",
  "mainImage",
  "additionalImages",
  "sources",
  "lastVerifiedAt",
] as const;

const IMAGE_KEYS = [
  "url",
  "alt",
  "width",
  "height",
  "author",
  "licenseName",
  "licenseUrl",
  "sourceUrl",
] as const;

const ACCESS_KEYS = [
  "departureAirport",
  "arrivalGateway",
  "routeSummary",
  "estimatedDuration",
  "transferCount",
  "localTransport",
  "note",
] as const;

const SOURCE_KEYS = ["title", "url", "type", "checkedAt"] as const;

export function validateSpotDataset(
  regionalFiles: unknown,
  manifestValue: unknown,
  profile: DatasetValidationProfile,
): SpotDatasetValidationResult {
  const errors: string[] = [];
  const manifest = validateManifest(manifestValue, errors);
  const exceptions = validateCountryLimitExceptions(profile.countryLimitExceptions, errors);
  const spots: Spot[] = [];
  const actualRegionCounts = createEmptyRegionCounts();
  const seenIds = new Map<string, string>();
  const seenSlugs = new Map<string, string>();

  validateProfile(profile.stage, manifest, errors);

  if (!isRecord(regionalFiles)) {
    errors.push("regionalFiles: 7地域をキーに持つオブジェクトが必要です");
  } else {
    validateExactKeys(regionalFiles, REGIONS, "regionalFiles", errors);

    for (const region of REGIONS) {
      const regionalFile = regionalFiles[region];

      if (regionalFile === undefined) {
        errors.push(`regionalFiles.${region}: 地域ファイルがありません`);
        continue;
      }

      const regionalSpots = validateRegionalFile(
        region,
        regionalFile,
        manifest?.schemaVersion,
        seenIds,
        seenSlugs,
        errors,
      );
      actualRegionCounts[region] = regionalSpots.rawCount;
      spots.push(...regionalSpots.validSpots);
    }
  }

  validateManifestCounts(manifest, actualRegionCounts, profile.stage, errors);
  validateCountryCounts(spots, exceptions, errors);
  validateSlugResolution(spots, errors);

  return {
    isValid: errors.length === 0,
    spots,
    errors,
  };
}

function validateManifest(value: unknown, errors: string[]): SpotDatasetManifest | null {
  const path = "manifest";

  if (!isRecord(value)) {
    errors.push(`${path}: オブジェクトが必要です`);
    return null;
  }

  validateExactKeys(
    value,
    ["schemaVersion", "datasetStage", "expectedTotal", "expectedRegionCounts", "lastUpdatedAt"],
    path,
    errors,
  );

  const schemaVersion = readPositiveInteger(value, "schemaVersion", path, errors);
  const datasetStage = readEnum(value, "datasetStage", ["sample", "release"] as const, path, errors);
  const expectedTotal = readNonNegativeInteger(value, "expectedTotal", path, errors);
  const expectedRegionCounts = validateExpectedRegionCounts(value.expectedRegionCounts, errors);
  const lastUpdatedAt = readOptionalDate(value.lastUpdatedAt, `${path}.lastUpdatedAt`, errors);

  if (schemaVersion !== undefined && schemaVersion !== DATASET_SCHEMA_VERSION) {
    errors.push(
      `${path}.schemaVersion: 対応バージョンは${DATASET_SCHEMA_VERSION}ですが、${schemaVersion}が指定されています`,
    );
  }

  if (
    schemaVersion === undefined ||
    datasetStage === undefined ||
    expectedTotal === undefined ||
    expectedRegionCounts === null
  ) {
    return null;
  }

  const regionCountTotal = REGIONS.reduce(
    (total, region) => total + expectedRegionCounts[region],
    0,
  );

  if (regionCountTotal !== expectedTotal) {
    errors.push(
      `${path}.expectedTotal: ${expectedTotal}ですが、expectedRegionCountsの合計は${regionCountTotal}です`,
    );
  }

  return {
    schemaVersion,
    datasetStage,
    expectedTotal,
    expectedRegionCounts,
    lastUpdatedAt,
  };
}

function validateExpectedRegionCounts(
  value: unknown,
  errors: string[],
): Record<Region, number> | null {
  const path = "manifest.expectedRegionCounts";

  if (!isRecord(value)) {
    errors.push(`${path}: 7地域の件数を持つオブジェクトが必要です`);
    return null;
  }

  validateExactKeys(value, REGIONS, path, errors);
  const counts = createEmptyRegionCounts();
  let hasInvalidCount = false;

  for (const region of REGIONS) {
    const count = readNonNegativeInteger(value, region, path, errors);

    if (count === undefined) {
      hasInvalidCount = true;
      continue;
    }

    counts[region] = count;
  }

  return hasInvalidCount ? null : counts;
}

function validateProfile(
  stage: DatasetStage,
  manifest: SpotDatasetManifest | null,
  errors: string[],
): void {
  if (stage !== "sample" && stage !== "release") {
    errors.push(`profile.stage: sampleまたはreleaseが必要です`);
    return;
  }

  if (manifest !== null && manifest.datasetStage !== stage) {
    errors.push(
      `profile.stage: ${stage}ですが、manifest.datasetStageは${manifest.datasetStage}です`,
    );
  }
}

function validateRegionalFile(
  expectedRegion: Region,
  value: unknown,
  manifestSchemaVersion: number | undefined,
  seenIds: Map<string, string>,
  seenSlugs: Map<string, string>,
  errors: string[],
): { rawCount: number; validSpots: Spot[] } {
  const filePath = `regionalFiles.${expectedRegion}`;

  if (!isRecord(value)) {
    errors.push(`${filePath}: オブジェクトが必要です`);
    return { rawCount: 0, validSpots: [] };
  }

  validateExactKeys(value, ["schemaVersion", "spots"], filePath, errors);
  const schemaVersion = readPositiveInteger(value, "schemaVersion", filePath, errors);

  if (schemaVersion !== undefined && schemaVersion !== DATASET_SCHEMA_VERSION) {
    errors.push(
      `${filePath}.schemaVersion: 対応バージョンは${DATASET_SCHEMA_VERSION}ですが、${schemaVersion}です`,
    );
  }

  if (
    schemaVersion !== undefined &&
    manifestSchemaVersion !== undefined &&
    schemaVersion !== manifestSchemaVersion
  ) {
    errors.push(
      `${filePath}.schemaVersion: manifestの${manifestSchemaVersion}と一致しません`,
    );
  }

  if (!Array.isArray(value.spots)) {
    errors.push(`${filePath}.spots: 配列が必要です`);
    return { rawCount: 0, validSpots: [] };
  }

  const validSpots: Spot[] = [];

  for (const [index, spotValue] of value.spots.entries()) {
    const spot = validateSpot(
      spotValue,
      expectedRegion,
      index,
      seenIds,
      seenSlugs,
      errors,
    );

    if (spot !== null) {
      validSpots.push(spot);
    }
  }

  return { rawCount: value.spots.length, validSpots };
}

function validateSpot(
  value: unknown,
  expectedRegion: Region,
  index: number,
  seenIds: Map<string, string>,
  seenSlugs: Map<string, string>,
  errors: string[],
): Spot | null {
  const rawIdentifier =
    isRecord(value) && typeof value.id === "string" && value.id.trim() !== ""
      ? `:${value.id}`
      : "";
  const path = `regionalFiles.${expectedRegion}.spots[${index}${rawIdentifier}]`;
  const errorCountBeforeValidation = errors.length;

  if (!isRecord(value)) {
    errors.push(`${path}: オブジェクトが必要です`);
    return null;
  }

  validateExactKeys(value, SPOT_KEYS, path, errors);

  const id = readNonEmptyString(value, "id", path, errors);
  const slug = readNonEmptyString(value, "slug", path, errors);
  readNonEmptyString(value, "name", path, errors);
  readOptionalNonEmptyString(value, "internalEnglishName", path, errors);
  const region = readEnum(value, "region", REGIONS, path, errors);
  readNonEmptyString(value, "country", path, errors);
  readNonEmptyString(value, "city", path, errors);
  validateCategories(value.categories, `${path}.categories`, errors);
  const description = readNonEmptyString(value, "description", path, errors);
  validateCoordinates(value.coordinates, `${path}.coordinates`, errors);
  validateHttpsUrl(value.googleMapsUrl, `${path}.googleMapsUrl`, errors);
  validateAccessFromTokyo(value.accessFromTokyo, `${path}.accessFromTokyo`, errors);
  validateImage(value.mainImage, `${path}.mainImage`, errors);
  validateAdditionalImages(value.additionalImages, `${path}.additionalImages`, errors);
  validateSources(value.sources, `${path}.sources`, errors);
  validateDate(value.lastVerifiedAt, `${path}.lastVerifiedAt`, errors);

  if (id !== undefined) {
    validateSlugLikeValue(id, `${path}.id`, errors);
    trackUniqueValue(id, `${path}.id`, seenIds, errors);
  }

  if (slug !== undefined) {
    validateSlugLikeValue(slug, `${path}.slug`, errors);
    trackUniqueValue(slug, `${path}.slug`, seenSlugs, errors);
  }

  if (region !== undefined && region !== expectedRegion) {
    errors.push(`${path}.region: ${region}ではなく${expectedRegion}である必要があります`);
  }

  if (description !== undefined && !JAPANESE_TEXT_PATTERN.test(description)) {
    errors.push(`${path}.description: 日本語の紹介文が必要です`);
  }

  if (errors.length !== errorCountBeforeValidation) {
    return null;
  }

  return value as unknown as Spot;
}

function validateCategories(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: 配列が必要です`);
    return;
  }

  if (value.length < 1 || value.length > 3) {
    errors.push(`${path}: 1個以上3個以下が必要ですが、${value.length}個です`);
  }

  const seenCategories = new Set<string>();

  value.forEach((category, index) => {
    if (!isAllowedValue(category, CATEGORIES)) {
      errors.push(`${path}[${index}]: 未対応のカテゴリです`);
      return;
    }

    if (seenCategories.has(category)) {
      errors.push(`${path}[${index}]: カテゴリ「${category}」が重複しています`);
      return;
    }

    seenCategories.add(category);
  });
}

function validateCoordinates(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: オブジェクトが必要です`);
    return;
  }

  validateExactKeys(value, ["latitude", "longitude"], path, errors);
  const latitude = readFiniteNumber(value, "latitude", path, errors);
  const longitude = readFiniteNumber(value, "longitude", path, errors);

  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    errors.push(`${path}.latitude: -90以上90以下が必要ですが、${latitude}です`);
  }

  if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
    errors.push(`${path}.longitude: -180以上180以下が必要ですが、${longitude}です`);
  }
}

function validateAccessFromTokyo(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: オブジェクトが必要です`);
    return;
  }

  validateExactKeys(value, ACCESS_KEYS, path, errors);
  readEnum(value, "departureAirport", ["羽田空港", "成田空港"] as const, path, errors);
  readNonEmptyString(value, "arrivalGateway", path, errors);
  readNonEmptyString(value, "routeSummary", path, errors);
  readNonEmptyString(value, "estimatedDuration", path, errors);
  readNonEmptyString(value, "localTransport", path, errors);
  readNonEmptyString(value, "note", path, errors);

  if (
    value.transferCount !== null &&
    (!Number.isInteger(value.transferCount) ||
      typeof value.transferCount !== "number" ||
      value.transferCount < 0)
  ) {
    errors.push(`${path}.transferCount: 0以上の整数またはnullが必要です`);
  }
}

function validateImage(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: オブジェクトが必要です`);
    return;
  }

  validateExactKeys(value, IMAGE_KEYS, path, errors);
  const url = readNonEmptyString(value, "url", path, errors);
  readNonEmptyString(value, "alt", path, errors);
  readPositiveInteger(value, "width", path, errors);
  readPositiveInteger(value, "height", path, errors);
  readNonEmptyString(value, "author", path, errors);
  readNonEmptyString(value, "licenseName", path, errors);
  validateHttpsUrl(value.licenseUrl, `${path}.licenseUrl`, errors);
  validateHttpsUrl(value.sourceUrl, `${path}.sourceUrl`, errors);

  if (url !== undefined) {
    validateImageUrl(url, `${path}.url`, errors);
  }
}

function validateImageUrl(value: string, path: string, errors: string[]): void {
  if (value === LOCAL_FALLBACK_IMAGE_URL) {
    return;
  }

  const parsedUrl = parseHttpsUrl(value, path, errors);

  if (parsedUrl !== null && parsedUrl.hostname !== WIKIMEDIA_IMAGE_HOST) {
    errors.push(
      `${path}: 許可ホストは${WIKIMEDIA_IMAGE_HOST}のみですが、${parsedUrl.hostname}です`,
    );
  }


  if (
    parsedUrl !== null &&
    !parsedUrl.pathname.startsWith(WIKIMEDIA_THUMB_PATH_PREFIX)
  ) {
    errors.push(
      `${path}: Wikimedia Commonsの派生画像パス${WIKIMEDIA_THUMB_PATH_PREFIX}配下が必要です`,
    );
  }

  if (parsedUrl !== null && parsedUrl.search !== "") {
    errors.push(`${path}: 画像URLにクエリ文字列を含めることはできません`);
  }
}

function validateAdditionalImages(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: 配列が必要です`);
    return;
  }

  if (value.length > 3) {
    errors.push(`${path}: 0枚以上3枚以下が必要ですが、${value.length}枚です`);
  }

  value.forEach((image, index) => validateImage(image, `${path}[${index}]`, errors));
}

function validateSources(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: 配列が必要です`);
    return;
  }

  if (value.length < 2) {
    errors.push(`${path}: 最低2件が必要ですが、${value.length}件です`);
  }

  value.forEach((source, index) => {
    const sourcePath = `${path}[${index}]`;

    if (!isRecord(source)) {
      errors.push(`${sourcePath}: オブジェクトが必要です`);
      return;
    }

    validateExactKeys(source, SOURCE_KEYS, sourcePath, errors);
    readNonEmptyString(source, "title", sourcePath, errors);
    validateHttpsUrl(source.url, `${sourcePath}.url`, errors);
    readEnum(source, "type", RESEARCH_SOURCE_TYPES, sourcePath, errors);
    validateDate(source.checkedAt, `${sourcePath}.checkedAt`, errors);
  });
}

function validateCountryLimitExceptions(
  value: unknown,
  errors: string[],
): ReadonlyMap<string, CountryLimitException> {
  const path = "profile.countryLimitExceptions";
  const exceptions = new Map<string, CountryLimitException>();

  if (!isRecord(value)) {
    errors.push(`${path}: オブジェクトが必要です`);
    return exceptions;
  }

  validateExactKeys(value, ["schemaVersion", "exceptions"], path, errors);
  const schemaVersion = readPositiveInteger(value, "schemaVersion", path, errors);

  if (schemaVersion !== undefined && schemaVersion !== DATASET_SCHEMA_VERSION) {
    errors.push(
      `${path}.schemaVersion: 対応バージョンは${DATASET_SCHEMA_VERSION}ですが、${schemaVersion}です`,
    );
  }

  if (!Array.isArray(value.exceptions)) {
    errors.push(`${path}.exceptions: 配列が必要です`);
    return exceptions;
  }

  value.exceptions.forEach((exceptionValue, index) => {
    const exceptionPath = `${path}.exceptions[${index}]`;

    if (!isRecord(exceptionValue)) {
      errors.push(`${exceptionPath}: オブジェクトが必要です`);
      return;
    }

    const errorCountBeforeValidation = errors.length;
    validateExactKeys(exceptionValue, ["country", "allowedCount", "reason"], exceptionPath, errors);
    const country = readNonEmptyString(exceptionValue, "country", exceptionPath, errors);
    const allowedCount = readPositiveInteger(exceptionValue, "allowedCount", exceptionPath, errors);
    const reason = readNonEmptyString(exceptionValue, "reason", exceptionPath, errors);

    if (allowedCount !== undefined && allowedCount <= MAX_SPOTS_PER_COUNTRY) {
      errors.push(
        `${exceptionPath}.allowedCount: ${MAX_SPOTS_PER_COUNTRY}を超える件数が必要です`,
      );
    }

    if (
      country === undefined ||
      allowedCount === undefined ||
      reason === undefined ||
      errors.length !== errorCountBeforeValidation
    ) {
      return;
    }

    if (exceptions.has(country)) {
      errors.push(`${exceptionPath}.country: 「${country}」の例外が重複しています`);
      return;
    }

    exceptions.set(country, { country, allowedCount, reason });
  });

  return exceptions;
}

function validateManifestCounts(
  manifest: SpotDatasetManifest | null,
  actualRegionCounts: Readonly<Record<Region, number>>,
  stage: DatasetStage,
  errors: string[],
): void {
  if (manifest === null) {
    return;
  }

  const actualTotal = REGIONS.reduce(
    (total, region) => total + actualRegionCounts[region],
    0,
  );

  if (actualTotal !== manifest.expectedTotal) {
    errors.push(
      `dataset.total: 実データは${actualTotal}件ですが、manifestは${manifest.expectedTotal}件です`,
    );
  }

  for (const region of REGIONS) {
    const actualCount = actualRegionCounts[region];
    const expectedCount = manifest.expectedRegionCounts[region];

    if (actualCount !== expectedCount) {
      errors.push(
        `dataset.regions.${region}: 実データは${actualCount}件ですが、manifestは${expectedCount}件です`,
      );
    }
  }

  if (stage !== "release") {
    return;
  }

  if (manifest.expectedTotal !== 200) {
    errors.push(
      `manifest.expectedTotal: releaseでは200件が必要ですが、${manifest.expectedTotal}件です`,
    );
  }

  if (actualTotal !== 200) {
    errors.push(`dataset.total: releaseでは200件が必要ですが、${actualTotal}件です`);
  }

  for (const region of REGIONS) {
    const releaseCount = RELEASE_REGION_COUNTS[region];

    if (manifest.expectedRegionCounts[region] !== releaseCount) {
      errors.push(
        `manifest.expectedRegionCounts.${region}: releaseでは${releaseCount}件が必要です`,
      );
    }

    if (actualRegionCounts[region] !== releaseCount) {
      errors.push(
        `dataset.regions.${region}: releaseでは${releaseCount}件が必要ですが、${actualRegionCounts[region]}件です`,
      );
    }
  }
}

function validateCountryCounts(
  spots: readonly Spot[],
  exceptions: ReadonlyMap<string, CountryLimitException>,
  errors: string[],
): void {
  const countryCounts = new Map<string, number>();

  for (const spot of spots) {
    countryCounts.set(spot.country, (countryCounts.get(spot.country) ?? 0) + 1);
  }

  for (const [country, count] of countryCounts) {
    if (count <= MAX_SPOTS_PER_COUNTRY) {
      continue;
    }

    const exception = exceptions.get(country);

    if (exception === undefined) {
      errors.push(
        `dataset.countries.${country}: ${count}件あり、上限${MAX_SPOTS_PER_COUNTRY}件を超えています。例外記録が必要です`,
      );
      continue;
    }

    if (count > exception.allowedCount) {
      errors.push(
        `dataset.countries.${country}: ${count}件あり、例外の許可件数${exception.allowedCount}件を超えています`,
      );
    }
  }
}

function validateSlugResolution(spots: readonly Spot[], errors: string[]): void {
  const spotsBySlug = new Map(spots.map((spot) => [spot.slug, spot]));

  for (const spot of spots) {
    if (spotsBySlug.get(spot.slug)?.id !== spot.id) {
      errors.push(
        `dataset.slugs.${spot.slug}: Detail slugから観光地「${spot.id}」を一意に解決できません`,
      );
    }
  }
}

function validateSlugLikeValue(value: string, path: string, errors: string[]): void {
  if (!SLUG_PATTERN.test(value)) {
    errors.push(`${path}: 小文字英数字と単語間のハイフンだけを使用してください`);
  }
}

function trackUniqueValue(
  value: string,
  path: string,
  seenValues: Map<string, string>,
  errors: string[],
): void {
  const firstPath = seenValues.get(value);

  if (firstPath !== undefined) {
    errors.push(`${path}: 「${value}」が${firstPath}と重複しています`);
    return;
  }

  seenValues.set(value, path);
}

function validateHttpsUrl(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path}: 空でないURL文字列が必要です`);
    return;
  }

  parseHttpsUrl(value, path, errors);
}

function parseHttpsUrl(value: string, path: string, errors: string[]): URL | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    errors.push(`${path}: 有効なURLではありません`);
    return null;
  }

  if (parsedUrl.protocol !== "https:") {
    errors.push(`${path}: HTTPS URLが必要です`);
  }

  if (parsedUrl.username !== "" || parsedUrl.password !== "") {
    errors.push(`${path}: URLに認証情報を含めることはできません`);
  }

  return parsedUrl;
}

function validateDate(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    errors.push(`${path}: YYYY-MM-DD形式の日付が必要です`);
    return;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    errors.push(`${path}: 実在する日付が必要です`);
  }
}

function readOptionalDate(
  value: unknown,
  path: string,
  errors: string[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const errorCountBeforeValidation = errors.length;
  validateDate(value, path, errors);

  if (errors.length !== errorCountBeforeValidation || typeof value !== "string") {
    return undefined;
  }

  return value;
}

function validateExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  errors: string[],
): void {
  const allowedKeySet = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowedKeySet.has(key)) {
      errors.push(`${path}.${key}: 許可されていないフィールドです`);
    }
  }
}

function readNonEmptyString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): string | undefined {
  const fieldValue = value[key];

  if (typeof fieldValue !== "string" || fieldValue.trim() === "") {
    errors.push(`${path}.${key}: 空でない文字列が必要です`);
    return undefined;
  }

  if (fieldValue !== fieldValue.trim()) {
    errors.push(`${path}.${key}: 先頭または末尾に空白を含めることはできません`);
  }

  return fieldValue;
}

function readOptionalNonEmptyString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): string | undefined {
  if (value[key] === undefined) {
    return undefined;
  }

  return readNonEmptyString(value, key, path, errors);
}

function readFiniteNumber(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): number | undefined {
  const fieldValue = value[key];

  if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) {
    errors.push(`${path}.${key}: 有限の数値が必要です`);
    return undefined;
  }

  return fieldValue;
}

function readPositiveInteger(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): number | undefined {
  const fieldValue = value[key];

  if (typeof fieldValue !== "number" || !Number.isInteger(fieldValue) || fieldValue <= 0) {
    errors.push(`${path}.${key}: 1以上の整数が必要です`);
    return undefined;
  }

  return fieldValue;
}

function readNonNegativeInteger(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): number | undefined {
  const fieldValue = value[key];

  if (typeof fieldValue !== "number" || !Number.isInteger(fieldValue) || fieldValue < 0) {
    errors.push(`${path}.${key}: 0以上の整数が必要です`);
    return undefined;
  }

  return fieldValue;
}

function readEnum<const TValues extends readonly string[]>(
  value: Record<string, unknown>,
  key: string,
  allowedValues: TValues,
  path: string,
  errors: string[],
): TValues[number] | undefined {
  const fieldValue = value[key];

  if (!isAllowedValue(fieldValue, allowedValues)) {
    errors.push(`${path}.${key}: ${allowedValues.join("、")}のいずれかが必要です`);
    return undefined;
  }

  return fieldValue;
}

function isAllowedValue<const TValues extends readonly string[]>(
  value: unknown,
  allowedValues: TValues,
): value is TValues[number] {
  return typeof value === "string" && (allowedValues as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createEmptyRegionCounts(): Record<Region, number> {
  return {
    asia: 0,
    europe: 0,
    "north-america": 0,
    "latin-america": 0,
    africa: 0,
    "middle-east-central-asia": 0,
    oceania: 0,
  };
}
