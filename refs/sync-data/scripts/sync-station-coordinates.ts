import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { StationRepository } from '@modules/stations/repositories/repository/station.repository';
import { StationEntity } from '@modules/stations/repositories/entities/station.entity';

interface RefStation {
    name: string;
    ref?: string;
    latitude: number;
    longitude: number;
    normFull: string;
    normNoComma: string;
    tokenKey: string;
}

const PREFIXES = [
    'tram xe buyt',
    'bến xe buýt',
    'ben xe buyt',
    'điểm dừng',
    'diem dung',
    'điểm đón',
    'diem don',
];

// Common Vietnamese abbreviations mapping
const ABBREVIATIONS: Record<string, string> = {
    // Bệnh viện
    bv: 'benh vien',
    'benh vien': 'benh vien',
    'bệnh viện': 'benh vien',
    'benh viện': 'benh vien',
    // Công viên
    cv: 'cong vien',
    'cong vien': 'cong vien',
    'công viên': 'cong vien',
    'cong viên': 'cong vien',
    // Đại học
    dh: 'dai hoc',
    'dai hoc': 'dai hoc',
    đh: 'dai hoc',
    'đại học': 'dai hoc',
    'dai học': 'dai hoc',
    // Ủy ban nhân dân
    ubnd: 'uy ban nhan dan',
    'uy ban nhan dan': 'uy ban nhan dan',
    'uỷ ban nhân dân': 'uy ban nhan dan',
    'ủy ban nhân dân': 'uy ban nhan dan',
    'uy ban nhân dân': 'uy ban nhan dan',
    'uỷ ban nhan dân': 'uy ban nhan dan',
    // Chợ
    ch: 'cho',
    cho: 'cho',
    // Trường học
    truong: 'truong',
    thpt: 'truong thpt',
    'truong thpt': 'truong thpt',
    ptth: 'pho thong trung hoc',
    'pho thong trung hoc': 'pho thong trung hoc',
    'truong mam non': 'truong mam non',
    'truong tieu hoc': 'truong tieu hoc',
    th: 'tieu hoc',
    'tieu hoc': 'tieu hoc',
    'truong thcs': 'truong thcs',
    thcs: 'trung hoc co so',
    'trung hoc co so': 'trung hoc co so',
    'truong mau giao': 'truong mau giao',
    mg: 'mau giao',
    'mau giao': 'mau giao',
    'truong cap 1': 'truong cap 1',
    'truong cap 2': 'truong cap 2',
    'truong cap 3': 'truong cap 3',
    c1: 'cap 1',
    c2: 'cap 2',
    c3: 'cap 3',
    // Cao đẳng
    cd: 'cao dang',
    'cao dang': 'cao dang',
    // Trung tâm
    tt: 'trung tam',
    'trung tam': 'trung tam',
    tttm: 'trung tam thuong mai',
    'trung tam thuong mai': 'trung tam thuong mai',
    // Ngân hàng
    nh: 'ngan hang',
    'ngan hang': 'ngan hang',
    // Công an
    ca: 'cong an',
    'cong an': 'cong an',
    // Tòa án nhân dân
    tand: 'toa an nhan dan',
    'toa an nhan dan': 'toa an nhan dan',
    // Nhà văn hóa
    nvh: 'nha van hoa',
    'nha van hoa': 'nha van hoa',
    // Nhà trẻ
    ntt: 'nha tre',
    'nha tre': 'nha tre',
    // Công ty
    ct: 'cong ty',
    'cong ty': 'cong ty',
    // Bến xe
    bx: 'ben xe',
    'ben xe': 'ben xe',
    // Cây xăng
    cx: 'cay xang',
    'cay xang': 'cay xang',
    // Nhà máy
    nm: 'nha may',
    'nha may': 'nha may',
    // Siêu thị
    st: 'sieu thi',
    'sieu thi': 'sieu thi',
    // Bưu điện
    bd: 'buu dien',
    'buu dien': 'buu dien',
    // Viện
    v: 'vien',
    vien: 'vien',
    // Bảo tàng
    bt: 'bao tang',
    'bao tang': 'bao tang',
    // Nhà thờ
    nt: 'nha tho',
    'nha tho': 'nha tho',
    // Vòng xoay
    vx: 'vong xoay',
    'vong xoay': 'vong xoay',
    // Sân bay / Sân banh
    sb: 'san bay',
    'san bay': 'san bay',
    'san banh': 'san banh',
    // Bãi xe
    'bai xe': 'bai xe',
    // Đình
    dinh: 'dinh',
    // Chùa
    chua: 'chua',
    // Lăng
    lang: 'lang',
    // Cầu
    cau: 'cau',
    // Khu
    khu: 'khu',
    // Sở
    so: 'so',
    // Phòng
    phong: 'phong',
};

const DIGIT_MAP: Record<string, string> = {
    '0': '0',
    khong: '0',
    mot: '1',
    một: '1',
    '1': '1',
    hai: '2',
    '2': '2',
    ba: '3',
    '3': '3',
    bon: '4',
    bốn: '4',
    tu: '4',
    tư: '4',
    '4': '4',
    nam: '5',
    năm: '5',
    '5': '5',
    sau: '6',
    sáu: '6',
    '6': '6',
    bay: '7',
    bảy: '7',
    '7': '7',
    tam: '8',
    tám: '8',
    '8': '8',
    chin: '9',
    chín: '9',
    '9': '9',
};

function normalizeWhitespace(value: string | undefined): string {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
}

function stripAccents(value: string): string {
    // First normalize Vietnamese special characters that might not be handled by NFD
    let result = value
        // Handle special U with hook (Uỷ -> U)
        .replace(/[ỦỦủủỬửỮữỰự]/g, 'u')
        .replace(/[ỦỦ]/g, 'U')
        // Handle other Vietnamese vowels
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[ÌÍỊỈĨ]/g, 'I')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/[ỲÝỴỶỸ]/g, 'Y')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

    // Then apply NFD normalization for any remaining diacritics
    return result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Expand abbreviations in a normalized string
 * This helps match abbreviated station names with full names in the reference data
 */
function expandAbbreviations(normalized: string): string {
    const words = normalized.split(' ').filter(Boolean);
    const expanded: string[] = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let wasExpanded = false;

        // Check single word abbreviation
        if (ABBREVIATIONS[word]) {
            const expansion = ABBREVIATIONS[word];
            expanded.push(expansion);
            wasExpanded = true;
        } else {
            // Check multi-word abbreviations (up to 4 words)
            let foundMultiWord = false;
            for (let len = 4; len >= 2; len--) {
                if (i + len - 1 < words.length) {
                    const phrase = words.slice(i, i + len).join(' ');
                    if (ABBREVIATIONS[phrase]) {
                        expanded.push(ABBREVIATIONS[phrase]);
                        i += len - 1; // Skip the words we just processed
                        foundMultiWord = true;
                        wasExpanded = true;
                        break;
                    }
                }
            }

            if (!foundMultiWord && !wasExpanded) {
                expanded.push(word);
            }
        }
    }

    return expanded.join(' ');
}

function simplifyName(raw: string | undefined): {
    normFull: string;
    normNoComma: string;
    tokenKey: string;
} {
    if (!raw) {
        return { normFull: '', normNoComma: '', tokenKey: '' };
    }

    // Lowercase + accent-insensitive
    let s = stripAccents(normalizeWhitespace(raw).toLowerCase());

    // Remove content inside brackets [] and () because chúng thường chứa mã trạm
    s = s.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ');

    // Remove common prefixes
    for (const prefix of PREFIXES) {
        if (s.startsWith(prefix + ' ')) {
            s = s.slice(prefix.length).trim();
            break;
        }
    }

    // Replace punctuation with space
    s = s.replace(/[,.\-;:/]/g, ' ');

    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();

    // Expand abbreviations BEFORE tokenization
    s = expandAbbreviations(s);

    const normFull = s;
    const normNoComma = s.split(',')[0]?.trim() || normFull;

    // Token key (bag-of-words sorted)
    const tokens = normFull
        .split(' ')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => DIGIT_MAP[t] ?? t); // unify số viết chữ/số

    const normalizedFullWithDigits = tokens.join(' ');
    const normalizedNoCommaWithDigits =
        normalizedFullWithDigits.split(',')[0]?.trim() ||
        normalizedFullWithDigits;

    const normFullFinal = normalizedFullWithDigits;
    const normNoCommaFinal = normalizedNoCommaWithDigits;

    const tokenKey = [...tokens].sort().join(' ');

    return { normFull: normFullFinal, normNoComma: normNoCommaFinal, tokenKey };
}

function loadRefStations(): RefStation[] {
    const filePath = path.join(process.cwd(), 'refs', 'station.json');
    if (!fs.existsSync(filePath)) {
        throw new Error(`station.json not found at ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as {
        features?: Array<{
            properties?: Record<string, unknown>;
            geometry?: { type?: string; coordinates?: number[] };
        }>;
    };

    if (!parsed.features || !Array.isArray(parsed.features)) {
        throw new Error('Invalid station.json format: missing features array');
    }

    const refs: RefStation[] = [];

    for (const feature of parsed.features) {
        const props = feature.properties || {};
        const geometry = feature.geometry;

        const name =
            typeof props['name'] === 'string'
                ? (props['name'] as string)
                : undefined;
        const ref =
            typeof props['ref'] === 'string'
                ? (props['ref'] as string)
                : undefined;

        if (
            !geometry ||
            geometry.type !== 'Point' ||
            !Array.isArray(geometry.coordinates) ||
            geometry.coordinates.length < 2
        ) {
            continue;
        }

        const [lon, lat] = geometry.coordinates;
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            continue;
        }

        if (!name) {
            continue;
        }

        const { normFull, normNoComma, tokenKey } = simplifyName(name);

        refs.push({
            name,
            ref,
            latitude: lat,
            longitude: lon,
            normFull,
            normNoComma,
            tokenKey,
        });
    }

    return refs;
}

function buildNameMap(refs: RefStation[]): Map<string, RefStation[]> {
    const map = new Map<string, RefStation[]>();

    const add = (key: string, ref: RefStation) => {
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key)!.push(ref);
    };

    for (const ref of refs) {
        add(ref.normFull, ref);
        add(ref.normNoComma, ref);
    }

    return map;
}

function assignRandomRef(refs: RefStation[]): void {
    for (const item of refs) {
        if (!item.ref) {
            item.ref = randomUUID().slice(0, 8);
        }
    }
}

function filterByRef(
    candidates: RefStation[],
    stationCode: string,
): RefStation[] {
    if (!candidates.length) return candidates;
    const normCode = simplifyName(stationCode).normFull;
    const matched = candidates.filter(
        (c) => c.ref && simplifyName(c.ref).normFull === normCode,
    );
    return matched.length ? matched : candidates;
}

// Common location words that should be filtered out when matching
const LOCATION_WORDS = new Set([
    'quan',
    'huyen',
    'phuong',
    'xa',
    'thi xa',
    'thi tran',
    'thanh pho',
    'tinh',
    'quoc gia',
]);

/**
 * Extract meaningful words from a normalized name by removing abbreviations
 * and returning the remaining significant words
 * Improved: Handles multi-word abbreviations (3+ words) and filters out location words
 */
function extractMeaningfulWords(normalizedName: string): string[] {
    const words = normalizedName.split(' ').filter(Boolean);
    const meaningfulWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let isAbbreviation = false;
        let skipCount = 0;

        // Check if current word is an abbreviation
        if (ABBREVIATIONS[word]) {
            isAbbreviation = true;
            skipCount = 0;
        } else {
            // Check for multi-word abbreviations (up to 4 words)
            for (let len = 4; len >= 2; len--) {
                if (i + len - 1 < words.length) {
                    const phrase = words
                        .slice(i, i + len)
                        .join(' ')
                        .toLowerCase();
                    if (ABBREVIATIONS[phrase]) {
                        isAbbreviation = true;
                        skipCount = len - 1;
                        break;
                    }
                }
            }
        }

        if (isAbbreviation) {
            i += skipCount; // Skip the abbreviation
            continue;
        }

        // Skip location words (quận, huyện, phường, etc.) and numbers that are likely district/ward numbers
        // Skip single digits or numbers that follow location words
        if (LOCATION_WORDS.has(word.toLowerCase())) {
            // Skip the location word and the following number if present
            if (i + 1 < words.length && /^\d+$/.test(words[i + 1])) {
                i += 1; // Skip the number too
            }
            continue;
        }

        // Skip standalone numbers (likely district/ward numbers)
        if (/^\d+$/.test(word) && meaningfulWords.length === 0) {
            continue;
        }

        // Keep meaningful words (not abbreviations, not location words)
        meaningfulWords.push(word);
    }

    return meaningfulWords;
}

/**
 * Try to match by searching for meaningful words in ref station names
 * Returns matches where all meaningful words from station name appear in ref name
 * Also handles reverse: where ref's meaningful words appear in station name
 * Improved: Also matches by substring and partial matches
 */
function matchByMeaningfulWords(
    stationNormalized: string,
    refs: RefStation[],
): RefStation[] {
    const stationMeaningfulWords = extractMeaningfulWords(stationNormalized);
    if (stationMeaningfulWords.length === 0) {
        return [];
    }

    const stationWordsSet = new Set(
        stationNormalized.split(' ').filter(Boolean),
    );

    // Create a search string from meaningful words for substring matching
    const stationSearchString = stationMeaningfulWords.join(' ');

    const matches = refs.filter((ref) => {
        const refMeaningfulWords = extractMeaningfulWords(ref.normFull);
        const refWordsSet = new Set(ref.normFull.split(' ').filter(Boolean));
        const refMeaningfulWordsSet = new Set(refMeaningfulWords);
        const refSearchString = refMeaningfulWords.join(' ');

        // Strategy 1: All station meaningful words appear in ref meaningful words
        // This is the most precise matching for abbreviations
        const stationWordsInRefMeaningful =
            stationMeaningfulWords.length > 0 &&
            stationMeaningfulWords.every((word) =>
                refMeaningfulWordsSet.has(word),
            );

        // Strategy 2: All station meaningful words appear in ref (handles abbreviations in station)
        // Fallback: check in all ref words (not just meaningful)
        const stationWordsInRef = stationMeaningfulWords.every((word) =>
            refWordsSet.has(word),
        );

        // Strategy 3: All ref meaningful words appear in station (handles abbreviations in ref)
        const refWordsInStation =
            refMeaningfulWords.length > 0 &&
            refMeaningfulWords.every((word) => stationWordsSet.has(word));

        // Strategy 4: Substring matching - station meaningful words form a substring in ref
        const stationSubstringInRef =
            stationSearchString.length > 0 &&
            refSearchString.includes(stationSearchString);

        // Strategy 5: Reverse substring - ref meaningful words form a substring in station
        const refSubstringInStation =
            refSearchString.length > 0 &&
            stationSearchString.includes(refSearchString);

        // Strategy 6: At least 2 meaningful words match (for better recall)
        // But only if we have at least 2 meaningful words
        const matchingWords = stationMeaningfulWords.filter((word) =>
            refMeaningfulWordsSet.has(word),
        );
        const hasEnoughMatches =
            stationMeaningfulWords.length >= 2 &&
            matchingWords.length >= 2 &&
            matchingWords.length >=
                Math.min(
                    stationMeaningfulWords.length,
                    refMeaningfulWords.length,
                ) *
                    0.6; // At least 60% of words match

        return (
            stationWordsInRefMeaningful ||
            stationWordsInRef ||
            refWordsInStation ||
            stationSubstringInRef ||
            refSubstringInStation ||
            hasEnoughMatches
        );
    });

    return matches;
}

function findRefStation(
    stationName: string,
    stationCode: string,
    nameMap: Map<string, RefStation[]>,
    refs: RefStation[],
): RefStation | undefined {
    const { normFull, normNoComma, tokenKey } = simplifyName(stationName);
    if (!normFull) return undefined;

    const tried = new Set<string>();

    const tryKey = (key: string): RefStation[] => {
        if (!key || tried.has(key)) return [];
        tried.add(key);
        return nameMap.get(key) || [];
    };

    // 1) Exact full
    let matches: RefStation[] = tryKey(normFull);

    // 2) Exact no-comma
    if (!matches.length) {
        matches = tryKey(normNoComma);
    }

    // 2.5) Try matching with common suffixes removed (cũ, mới, etc.)
    if (!matches.length) {
        const commonSuffixes = ['cu', 'moi', 'khu', 'ben'];
        for (const suffix of commonSuffixes) {
            // Try removing suffix from station name
            const stationWithoutSuffix = normFull
                .replace(new RegExp(`\\s+${suffix}$`, 'g'), '')
                .trim();
            if (stationWithoutSuffix !== normFull) {
                matches = tryKey(stationWithoutSuffix);
                if (matches.length) break;
            }

            // Try matching refs with suffix against station name without suffix
            const refsWithSuffix = refs.filter((r) => {
                const refWithoutSuffix = r.normFull
                    .replace(new RegExp(`\\s+${suffix}$`, 'g'), '')
                    .trim();
                return (
                    refWithoutSuffix === normFull ||
                    refWithoutSuffix === normNoComma
                );
            });
            if (refsWithSuffix.length) {
                matches = refsWithSuffix;
                break;
            }
        }
    }

    // 3) Substring: ref name is contained in station name
    if (!matches.length) {
        matches = refs.filter(
            (r) => r.normFull && normFull.includes(r.normFull),
        );
    }

    // 3.5) Match by removing abbreviations and searching for remaining words
    // This handles cases like "BV Trưng Vương" -> search for "Trưng Vương"
    // IMPORTANT: If multiple matches with DIFFERENT names found, skip to avoid ambiguity
    if (!matches.length) {
        // Check if removing abbreviations would yield multiple matches
        const stationMeaningfulWords = extractMeaningfulWords(normFull);
        const stationAllWords = normFull.split(' ').filter(Boolean);

        // Only use this strategy if abbreviations were removed
        if (
            stationMeaningfulWords.length > 0 &&
            stationMeaningfulWords.length < stationAllWords.length
        ) {
            const stationSearchString = stationMeaningfulWords.join(' ');
            if (stationSearchString.length >= 3) {
                // Check how many matches we would get
                // Try both directions: station search string in ref, and ref meaningful words in station
                const potentialMatches = refs.filter((ref) => {
                    const refNormFull = ref.normFull || '';
                    const refNormNoComma = ref.normNoComma || '';

                    // Strategy 1: Station meaningful words appear in ref name
                    if (
                        refNormFull.includes(stationSearchString) ||
                        refNormNoComma.includes(stationSearchString)
                    ) {
                        return true;
                    }

                    // Strategy 2: Ref meaningful words appear in station name
                    const refMeaningfulWords =
                        extractMeaningfulWords(refNormFull);
                    if (refMeaningfulWords.length > 0) {
                        const refSearchString = refMeaningfulWords.join(' ');
                        if (
                            refSearchString.length >= 3 &&
                            (normFull.includes(refSearchString) ||
                                normNoComma.includes(refSearchString))
                        ) {
                            return true;
                        }
                    }

                    return false;
                });

                // If exactly one match, use it
                if (potentialMatches.length === 1) {
                    matches = potentialMatches;
                }
                // If multiple matches, check if they have different names
                else if (potentialMatches.length > 1) {
                    // Get unique normalized names from matches
                    const uniqueNames = new Set(
                        potentialMatches.map(
                            (m) => simplifyName(m.name).normFull,
                        ),
                    );

                    // If all matches have the same name (likely duplicates), use the first one
                    if (uniqueNames.size === 1) {
                        matches = [potentialMatches[0]];
                    }
                    // If matches have different names, skip to avoid ambiguity
                    // Example: "Lãnh Bình Thăng" matches both "Công viên Lãnh Bình Thăng" and "Chợ Lãnh Bình Thăng"
                    else {
                        return undefined;
                    }
                }
                // If no matches, continue to next strategy
            }
        }
    }

    // 4) Match by meaningful words (handles abbreviations) - PRIORITIZE THIS
    // Extract meaningful words after removing abbreviations and try matching
    // This should come before bag-of-words to handle abbreviations better
    if (!matches.length) {
        matches = matchByMeaningfulWords(normFull, refs);
    }

    // 5) Bag-of-words subset: all ref tokens contained in station tokens
    if (!matches.length) {
        const stationTokens = new Set(normFull.split(' ').filter(Boolean));
        matches = refs.filter((r) => {
            if (!r.tokenKey) return false;
            const refTokens = r.tokenKey.split(' ').filter(Boolean);
            return refTokens.every((t) => stationTokens.has(t));
        });
    }

    // 5.5) Reverse bag-of-words: station tokens contained in ref tokens
    if (!matches.length) {
        const stationTokens = normFull.split(' ').filter(Boolean);
        matches = refs.filter((r) => {
            if (!r.normFull) return false;
            const refTokensSet = new Set(r.normFull.split(' ').filter(Boolean));
            // At least 2 tokens match
            const matchingTokens = stationTokens.filter((t) =>
                refTokensSet.has(t),
            );
            return matchingTokens.length >= 2;
        });
    }

    // 6) Final fallback: Find common important words (excluding common words)
    if (!matches.length) {
        const commonWords = new Set([
            'quan',
            'huyen',
            'phuong',
            'xa',
            'duong',
            'nga',
            'nga ba',
            'nga tu',
            'ben',
            'tram',
            'cho',
            'truong',
            'benh vien',
            'cong vien',
            'dai hoc',
        ]);
        const stationWords = normFull
            .split(' ')
            .filter((w) => w.length > 2 && !commonWords.has(w));

        if (stationWords.length >= 2) {
            matches = refs.filter((r) => {
                if (!r.normFull) return false;
                const refWords = r.normFull
                    .split(' ')
                    .filter((w) => w.length > 2 && !commonWords.has(w));
                const commonCount = stationWords.filter((w) =>
                    refWords.includes(w),
                ).length;
                // At least 2 common important words
                return commonCount >= 2;
            });
        }
    }

    if (!matches.length) return undefined;

    const resolved = filterByRef(matches, stationCode);

    // IMPORTANT: If multiple matches found, try to find the best match
    if (resolved.length === 0) {
        return undefined;
    }

    if (resolved.length === 1) {
        return resolved[0];
    }

    // If multiple matches, check if this came from partial matching after removing abbreviations
    // In that case, we should skip to avoid ambiguity ONLY if matches have significantly different names
    const stationMeaningfulWords = extractMeaningfulWords(normFull);
    const stationAllWords = normFull.split(' ').filter(Boolean);

    // Check if we're dealing with partial matching (abbreviations were removed)
    const isPartialMatch =
        stationMeaningfulWords.length > 0 &&
        stationMeaningfulWords.length < stationAllWords.length;

    if (isPartialMatch && resolved.length > 1) {
        // For partial matches with multiple results, check if they have different names
        // If all matches have the same normalized name, it's likely duplicates - choose one
        // If matches have different names, skip to avoid ambiguity

        // Get unique normalized names from matches
        const uniqueNames = new Set(
            resolved.map((m) => simplifyName(m.name).normFull),
        );

        // If there's more than one unique name, skip to avoid ambiguity
        // Example: "Lãnh Bình Thăng" matches both "Công viên Lãnh Bình Thăng" and "Chợ Lãnh Bình Thăng"
        if (uniqueNames.size > 1) {
            return undefined;
        }

        // If all matches have the same name (likely duplicates), choose the first one
        // Example: "Đại học Kinh tế Luật" appears multiple times in JSON
        if (uniqueNames.size === 1) {
            return resolved[0];
        }
    }

    // If multiple matches from other strategies, try to find the best one by meaningful words matching
    // This helps when there are multiple similar names
    if (stationMeaningfulWords.length > 0) {
        const scoredMatches = resolved.map((match) => {
            const refMeaningfulWords = extractMeaningfulWords(match.normFull);
            const refMeaningfulWordsSet = new Set(refMeaningfulWords);

            // Count how many station meaningful words match ref meaningful words
            const matchingCount = stationMeaningfulWords.filter((word) =>
                refMeaningfulWordsSet.has(word),
            ).length;

            // Score: percentage of matching meaningful words
            const score =
                stationMeaningfulWords.length > 0
                    ? matchingCount / stationMeaningfulWords.length
                    : 0;

            return { match, score, matchingCount };
        });

        // Sort by score (highest first), then by matching count
        scoredMatches.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 0.01) {
                return b.score - a.score;
            }
            return b.matchingCount - a.matchingCount;
        });

        // Only return if the best match has a high score (>= 80% match)
        const bestMatch = scoredMatches[0];
        if (bestMatch.score >= 0.8 && bestMatch.matchingCount >= 2) {
            // Check if there's a tie - if so, skip
            const secondBest = scoredMatches[1];
            if (
                secondBest &&
                Math.abs(bestMatch.score - secondBest.score) < 0.1 &&
                bestMatch.matchingCount === secondBest.matchingCount
            ) {
                // Too close, skip to avoid ambiguity
                return undefined;
            }
            return bestMatch.match;
        }
    }

    // If we can't find a clear best match, skip (don't randomly choose)
    return undefined;
}

async function syncStationCoordinates(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const stationRepository = app.get<StationRepository>(StationRepository);
        const refStations = loadRefStations();
        const nameMap = buildNameMap(refStations);

        const stations = await stationRepository.find<StationEntity>(
            {},
            { lean: true },
        );

        let matched = 0;
        let updated = 0;
        let notFound = 0;
        let skippedHasCoords = 0;

        for (const station of stations) {
            if (
                station.coordinates?.latitude &&
                station.coordinates?.longitude
            ) {
                skippedHasCoords += 1;
                continue;
            }

            const refStation = findRefStation(
                station.stationName,
                station.stationCode,
                nameMap,
                refStations,
            );

            if (!refStation) {
                notFound += 1;
                const normalized = simplifyName(station.stationName);
                // eslint-disable-next-line no-console
                console.warn(
                    `No coordinate match for station "${station.stationName}" (${station.stationCode})`,
                );
                // eslint-disable-next-line no-console
                console.warn(`  -> Normalized: "${normalized.normFull}"`);
                continue;
            }

            matched += 1;

            const updateData: Partial<StationEntity> = {
                coordinates: {
                    latitude: refStation.latitude,
                    longitude: refStation.longitude,
                },
            };

            const result = await stationRepository.update(
                { stationCode: station.stationCode },
                updateData,
            );

            if (result) {
                updated += 1;
                // eslint-disable-next-line no-console
                console.log(
                    `✓ Matched: "${station.stationName}" (${station.stationCode}) -> "${refStation.name}" [${refStation.latitude}, ${refStation.longitude}]`,
                );
            }
        }

        // eslint-disable-next-line no-console
        console.log(
            `Coordinate sync completed. Matched: ${matched}, Updated: ${updated}, Not found: ${notFound}, Skipped existing coords: ${skippedHasCoords}`,
        );
    } finally {
        await app.close();
    }
}

syncStationCoordinates().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Station coordinate sync failed:', err);
    process.exit(1);
});
