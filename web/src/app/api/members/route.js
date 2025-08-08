"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const zod_1 = require("zod");
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ROLE_ID = process.env.DISCORD_VOITANS_ROLE_ID || "1140381309500412008";
/**
 * Performans modu:
 * - Canlı Discord çağrıları pahalı/ yavaş olabilir. UI'da sayfa geçişlerindeki gecikmeyi azaltmak için
 *   process-ömrü memory cache etkinleştirildi.
 * - Response'lar yine no-store, sadece sunucu tarafında kısa TTL ile hızlandırma yapılır.
 */
const IDS_TTL_MS = 60 * 1000; // 1 dk: toplu member listesi (id/roles/nick/user minimal)
const HYDRATE_TTL_MS = 5 * 60 * 1000; // 5 dk: enriched kullanıcı snapshot
const BG_CONCURRENCY = Math.max(2, Number(process.env.VOITANS_BG_CONCURRENCY || 3));
// Role priority (highest to lowest) - provided by user
const ROLE_PRIORITY = [
    "1140637368005689504", // Guild Master
    "1249512318929342505", // Senior Officer
    "1401260293333586122", // Marshal
    "1178104722675204287", // Field Officer
    "1220045189679415358", // Veteran
    "1140381309500412008", // Voitans
];
// Zod şemaları – tip güvenliği ve tutarlı response için
const MemberSchema = zod_1.z.object({
    id: zod_1.z.string(),
    username: zod_1.z.string(),
    avatarUrl: zod_1.z.string().optional(),
    dominantRole: zod_1.z.string().nullable().optional(),
    dominantRoleColor: zod_1.z.string().nullable().optional(),
    dominantRoleName: zod_1.z.string().nullable().optional(),
    rolePriorityIndex: zod_1.z.number().optional(),
    hydratedAt: zod_1.z.number().optional(),
});
const ApiResponseSchema = zod_1.z.object({
    members: zod_1.z.array(MemberSchema),
    total: zod_1.z.number(),
    totalPages: zod_1.z.number(),
    page: zod_1.z.number(),
    limit: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
    hydratedUntil: zod_1.z.number().optional(),
    backgroundRefresh: zod_1.z.boolean().optional(),
    wallHintCount: zod_1.z.number().optional(),
});
// Helpers
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const avatarUrl = (u) => u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(u.id) % 5}.png`;
const g = globalThis;
const memoryCache = g.__voitansCache ?? new Map();
g.__voitansCache = memoryCache;
function getCache(key) {
    const hit = memoryCache.get(key);
    if (!hit)
        return null;
    const now = Date.now();
    if (hit.expires && hit.expires > now)
        return hit.value;
    memoryCache.delete(key);
    return null;
}
function setCache(key, value, ttlMs) {
    const expires = Date.now() + ttlMs;
    memoryCache.set(key, { value, expires });
}
function getOrInit(key, factory) {
    const cached = getCache(key);
    if (cached)
        return cached;
    const v = factory();
    // varsayılan 10 dk; çağıran fonksiyon uygun gördüğünde üzerine yazar
    memoryCache.set(key, { value: v, expires: Date.now() + 10 * 60 * 1000 });
    return v;
}
function markRefreshing(_key, _refreshing) { }
function shouldSoftRefresh(key, ttlMs) {
    const hit = memoryCache.get(key);
    if (!hit)
        return true;
    const now = Date.now();
    const remaining = hit.expires - now;
    return remaining < ttlMs * 0.2; // TTL'in son %20'sinde yenile
}
// tiny backoff helper (ms)
async function backoff(attempt, base = 300) {
    const wait = Math.min(5000, Math.pow(2, attempt - 1) * base);
    await new Promise((r) => setTimeout(r, wait));
}
// Fetch guild roles (id -> colorHex)
async function fetchGuildRolesColorMap() {
    const cacheKey = "guild:roles:colorMap";
    const cached = getCache(cacheKey);
    if (cached)
        return cached;
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
        cache: "no-store",
        next: { revalidate: 0 },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch roles: ${res.status}`);
    }
    const roles = (await res.json());
    const toHex = (n) => (n ? "#" + n.toString(16).padStart(6, "0") : null);
    const map = {};
    for (const r of roles)
        map[r.id] = toHex(r.color);
    setCache(cacheKey, map, 15 * 60 * 1000); // 15 dk
    return map;
}
// Fetch guild roles (id -> name)
async function fetchGuildRoleNames() {
    const cacheKey = "guild:roles:nameMap";
    const cached = getCache(cacheKey);
    if (cached)
        return cached;
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
        cache: "no-store",
        next: { revalidate: 0 },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch roles: ${res.status}`);
    }
    const roles = (await res.json());
    const map = {};
    for (const r of roles)
        map[r.id] = r.name;
    setCache(cacheKey, map, 15 * 60 * 1000); // 15 dk
    return map;
}
// Pick highest priority role for a user
function pickDominantRole(userRoleIds) {
    for (let i = 0; i < ROLE_PRIORITY.length; i++) {
        const rid = ROLE_PRIORITY[i];
        if (userRoleIds.includes(rid))
            return { roleId: rid, priorityIndex: i };
    }
    return { roleId: null, priorityIndex: ROLE_PRIORITY.length };
}
async function fetchUserBasic(id) {
    const cacheKey = `user:${id}`;
    const cached = getCache(cacheKey);
    if (cached)
        return cached;
    const u = await fetchUserBasicNoCache(id);
    if (u)
        setCache(cacheKey, u, 60 * 60 * 1000); // 60 dk TTL
    return u;
}
async function fetchUserBasicNoCache(id) {
    // Exponential backoff for 429s
    const maxAttempts = 4;
    let attempt = 0;
    let lastErr = null;
    while (attempt < maxAttempts) {
        attempt++;
        const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
            headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
            cache: "no-store",
            next: { revalidate: 0 },
        });
        if (res.status === 429) {
            const retryAfter = Number(res.headers.get("retry-after")) || 0;
            const base = Math.pow(2, attempt - 1) * 500; // 500ms, 1s, 2s, 4s
            const wait = Math.max(base, retryAfter * 1000);
            await new Promise((r) => setTimeout(r, wait));
            continue;
        }
        if (!res.ok) {
            lastErr = new Error(`Discord API error: ${res.status}`);
            break;
        }
        const user = (await res.json());
        return user;
    }
    if (lastErr)
        console.warn("[/api/members] fetchUserBasic failed:", lastErr);
    return null;
}
/**
 * Guild üyelerini rollerle birlikte topluca getir (yüksek verim)
 * - Discord endpoint /members zaten rolleri beraber döner; tek tek /members/{id} çağrısı yapmayız.
 * - sayfa başına 1000 ve artan id ile tüm üyeler taranır.
 * - Sonuç memoryCache'e TTL ile yazılır (IDS_TTL_MS boyunca).
 */
/**
 * Tek geçişte maksimum veri: id, roles, nick, username/global_name ve avatar hash.
 * Böylece /users/{id} ek çağrısına gerek kalmaz.
 */
async function fetchGuildMembersAll() {
    // Memory cached minimal list
    const cacheKey = `guild:${GUILD_ID}:members:minimal`;
    const cached = getCache(cacheKey);
    if (cached)
        return cached;
    const items = [];
    const perPage = 1000;
    let after = "0";
    const maxAttempts = 4;
    while (true) {
        let attempt = 0;
        let res = null;
        while (attempt < maxAttempts) {
            attempt++;
            const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=${perPage}&after=${after}`;
            res = await fetch(url, { headers: { Authorization: `Bot ${DISCORD_TOKEN}` }, cache: "no-store", next: { revalidate: 0 } });
            if (res.status === 429) {
                const retryAfter = Number(res.headers.get("retry-after")) || 0;
                const base = Math.pow(2, attempt - 1) * 500;
                const wait = Math.max(base, retryAfter * 1000);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            break;
        }
        if (!res || !res.ok)
            break;
        const chunk = (await res.json());
        if (!chunk.length)
            break;
        for (const m of chunk) {
            // Roller + nick + user (username/global_name + avatar) tek endpoint’ten geliyor.
            items.push({
                id: m.user.id,
                roles: m.roles ?? [],
                nick: m.nick ?? null,
                username: m.user.username,
                global_name: m.user.global_name,
                avatar: m.user.avatar,
            });
        }
        after = chunk[chunk.length - 1].user.id;
        if (chunk.length < perPage)
            break;
    }
    // Cache minimal list to speed up subsequent paging/filtering
    setCache(cacheKey, items, IDS_TTL_MS);
    return items;
}
/**
 * Tekil rol sorgusunu zorunlu olmadıkça kullanmayalım.
 * fetchGuildMembersAll zaten rolleri getiriyor. Bu fonksiyon yalnızca "sonradan doğrulama" için failover.
 */
async function fetchMemberRoles(userId) {
    const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`;
    const res = await fetch(url, { headers: { Authorization: `Bot ${DISCORD_TOKEN}` }, cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok)
        return null;
    const json = (await res.json());
    return json.roles ?? null;
}
async function GET(req) {
    if (!DISCORD_TOKEN || !GUILD_ID) {
        return server_1.NextResponse.json({ error: "Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID" }, { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    // Cache kapalı mod: fresh parametresi göz ardı edilir
    const forceFresh = "1";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    // limit=all desteği: tüm Voitans üyelerini tek cevapta döndür
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit === "all" ? Number.MAX_SAFE_INTEGER : Math.min(100, Math.max(1, Number(rawLimit || 12)));
    const sort = (searchParams.get("sort") || "rolePriority");
    const order = (searchParams.get("order") || "asc");
    const q = (searchParams.get("q") || "").toLowerCase();
    // Rol filtresi: hem isim hem roleId destekle
    // Örnekler:
    // - role=name:marshal
    // - role=id:1140637368005689504
    // - role=voitans (geri uyumlu kısayol)
    const rawRole = (searchParams.get("role") || "all").toLowerCase();
    let roleFilterMode = "all";
    let roleFilterValue = "";
    if (rawRole && rawRole !== "all") {
        const m = rawRole.match(/^(name|id):(.+)$/);
        if (m) {
            roleFilterMode = m[1] === "id" ? "byId" : "byName";
            roleFilterValue = m[2];
        }
        else {
            // geri uyumlu: guildmaster/seniorofficer/.../voitans
            roleFilterMode = "byName";
            const map = {
                guildmaster: "Guild Master",
                seniorofficer: "Senior Officer",
                marshal: "Marshal",
                fieldofficer: "Field Officer",
                veteran: "Veteran",
                voitans: "Voitans",
            };
            roleFilterValue = map[rawRole] || rawRole;
        }
    }
    try {
        // 0) ETag/If-None-Match: rev anahtarı üretimi
        // Amaç: aynı parametrelerle aynı snapshot için gereksiz JSON taşımadan 304 döndürmek.
        const urlObj = new URL(req.url);
        const qp = urlObj.searchParams;
        // Role, q, sort, order, limit ve page dışındaki parametreleri göz ardı et
        const revBase = JSON.stringify({
            role: (qp.get("role") || "all"),
            q: (qp.get("q") || ""),
            sort: (qp.get("sort") || "rolePriority"),
            order: (qp.get("order") || "asc"),
            limit: (qp.get("limit") || "12"),
            // page dahil edilmez; aynı snapshot içinde farklı sayfalar 304 dönerse slice gönderilmeli.
            // Bu yüzden ETag’ı GLOBAL snapshot’a bağlayıp aşağıda slice bazlı 200 döndürmeye devam edeceğiz.
        });
        // TTL ile birlikte değişecek hafif bir rev karması
        const revKey = Buffer.from(revBase).toString("base64").slice(0, 24);
        const ifNoneMatch = req.headers.get("if-none-match");
        let allMembers = await fetchGuildMembersAll();
        // Ön eleme: Sadece "Voitans" (ROLE_ID) rolüne sahip kullanıcılar listelensin.
        // Hiyerarşi rollerinden birine sahip olma şartını kaldırdık; herkes listelenir.
        const allIds = allMembers
            .filter((m) => m.roles?.includes(ROLE_ID)) // Voitans zorunlu koşul
            .map((m) => m.id);
        // 2) Kullanıcıların rollerini ve temel bilgilerini toplayıp
        //    GLOBAL sırala + sonra sayfalama uygula
        // OPTIMIZATION: Roller tüm üyeler için yukarıdaki listede var (chunked fetch).
        // enrichedMap içine "roles" alanını da koyup, dominantRole hesaplamasını tek seferde yapalım.
        const roleColors = await fetchGuildRolesColorMap();
        const roleNames = await fetchGuildRoleNames();
        // Enriched TTL cache
        const enrichedCacheKey = `role:${ROLE_ID}:enriched`;
        const enrichedMap = getOrInit(enrichedCacheKey, () => ({}));
        const hydrateTtlMs = HYDRATE_TTL_MS;
        const now = Date.now();
        // Tüm ID'ler için temel bilgiler + dominant rol tespiti (global)
        // Kademeli zenginleştirme:
        // - İlk sayfadaki kullanıcıları "hemen" hydrate et (garanti)
        // - Kalanları arka planda hydrate et (rate-limit güvenli)
        async function hydrateOne(id, knownRoles, knownNick, knownUser) {
            const cached = enrichedMap[id];
            // 1) Geçerli cache varsa kullan ve eksik alanları snapshot'tan tamamla
            if (cached && cached.hydratedAt && now - cached.hydratedAt < hydrateTtlMs) {
                if (knownRoles && (!cached.roles || cached.roles.length === 0)) {
                    cached.roles = knownRoles;
                    const picked = pickDominantRole(knownRoles);
                    cached.dominantRole = picked.roleId;
                    cached.rolePriorityIndex = picked.priorityIndex;
                    cached.dominantRoleColor = picked.roleId ? roleColors[picked.roleId] ?? null : null;
                    cached.dominantRoleName = picked.roleId ? roleNames[picked.roleId] ?? null : null;
                }
                if (knownNick !== undefined) {
                    cached.nick = knownNick;
                    if (knownNick && knownNick.trim())
                        cached.username = knownNick;
                }
                if (knownUser?.avatar && (!cached.avatarUrl || !cached.avatarUrl.includes(knownUser.avatar))) {
                    cached.avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${knownUser.avatar}.png?size=64`;
                }
                enrichedMap[id] = cached;
                setCache(enrichedCacheKey, enrichedMap, 10 * 60 * 1000);
                return cached;
            }
            // 2) Taze hydrate
            const roles = knownRoles ?? (await fetchMemberRoles(id)) ?? [];
            const { roleId: dominantRole, priorityIndex } = pickDominantRole(roles);
            const dominantRoleColor = dominantRole ? roleColors[dominantRole] ?? null : null;
            const displayName = (knownNick && knownNick.trim())
                ? knownNick
                : (knownUser?.global_name || knownUser?.username || "Discord User");
            const enriched = {
                id,
                username: displayName,
                avatarUrl: knownUser?.avatar
                    ? `https://cdn.discordapp.com/avatars/${id}/${knownUser.avatar}.png?size=64`
                    : `https://cdn.discordapp.com/embed/avatars/${Number(id) % 5}.png`,
                roles,
                nick: knownNick ?? null,
                dominantRole,
                dominantRoleColor,
                dominantRoleName: dominantRole ? roleNames[dominantRole] ?? null : null,
                rolePriorityIndex: priorityIndex,
                hydratedAt: Date.now(),
            };
            enrichedMap[id] = enriched;
            setCache(enrichedCacheKey, enrichedMap, 10 * 60 * 1000);
            return enriched;
        }
        // Önce tüm ID'ler için "mevcut cache" verisini al, eksik olanları lazy olarak işaretle
        const pageStart = (page - 1) * limit;
        const pageIds = allIds.slice(pageStart, pageStart + limit);
        // İlk olarak: sayfadaki üyeleri hydrate et (garanti) — roller listeden verilir (kesin)
        const rolesById = new Map(allMembers.map(m => [m.id, m.roles ?? []]));
        const nicksById = new Map(allMembers.map(m => [m.id, m.nick ?? null]));
        const usersById = new Map(allMembers.map(m => [m.id, { username: m.username, global_name: m.global_name, avatar: m.avatar }]));
        const pageMembers = await Promise.all(pageIds.map((id) => hydrateOne(id, rolesById.get(id), nicksById.get(id), usersById.get(id))));
        // Global sıralama için TUM listeyi skorlayabilmek adına:
        // - Cache'te olanları kullan
        // - Cache'te olmayanlar için "minimal stub" üretip priorityIndex'i ROLE_PRIORITY.length yap
        const snapshotAll = allIds.map((id) => {
            const e = enrichedMap[id];
            if (e)
                return e;
            // Snapshot'ta nick biliniyorsa onu da taşıyalım
            const fallbackNick = (allMembers.find((m) => m.id === id)?.nick ?? null) || null;
            return {
                id,
                username: fallbackNick || "Discord User",
                nick: fallbackNick,
                avatarUrl: undefined,
                dominantRole: null,
                dominantRoleColor: null,
                dominantRoleName: null,
                rolePriorityIndex: ROLE_PRIORITY.length,
                hydratedAt: 0,
            };
        });
        // 2.5) Global sıralama kalitesini artırmak için: ilk N (ör. 36) ID'nin
        // rolePriorityIndex değerini hızlıca kesinleştir (sadece roller çekilir).
        // Böylece ilk sayfalar her zaman hiyerarşik olarak doğru görünür.
        // Quick prior doğrulaması artık liste rollerine dayalı; ek API çağrısı yok.
        {
            const QUICK_PRIOR_COUNT = Math.min(allIds.length, Math.max(limit * 3, 36));
            const quickIds = allIds.slice(0, QUICK_PRIOR_COUNT);
            for (const id of quickIds) {
                const r = rolesById.get(id) ?? [];
                const { roleId, priorityIndex } = pickDominantRole(r);
                const existing = enrichedMap[id];
                const knownNick = nicksById.get(id) ?? null;
                if (existing) {
                    existing.roles = r;
                    existing.dominantRole = roleId;
                    existing.rolePriorityIndex = priorityIndex;
                    existing.dominantRoleColor = roleId ? roleColors[roleId] ?? null : null;
                    existing.dominantRoleName = roleId ? roleNames[roleId] ?? null : null;
                    if (knownNick !== undefined) {
                        existing.nick = knownNick;
                        if (knownNick && knownNick.trim())
                            existing.username = knownNick;
                    }
                    enrichedMap[id] = existing;
                }
                else {
                    enrichedMap[id] = {
                        id,
                        username: (knownNick && knownNick.trim()) ? knownNick : "Discord User",
                        avatarUrl: undefined,
                        roles: r,
                        nick: knownNick,
                        dominantRole: roleId,
                        dominantRoleColor: roleId ? roleColors[roleId] ?? null : null,
                        dominantRoleName: roleId ? roleNames[roleId] ?? null : null,
                        rolePriorityIndex: priorityIndex,
                        hydratedAt: 0,
                    };
                }
            }
            setCache(enrichedCacheKey, enrichedMap, 10 * 60 * 1000);
        }
        // Global sıralama (rolePriorityIndex -> name fallback)
        // Not: Voitans dışında tanımlı rollerden biri varsa bu önceliklendirilir;
        // hiçbiri yoksa en düşük öncelikte kalır ve isimle sıralanır.
        snapshotAll.sort((a, b) => {
            const ap = a.rolePriorityIndex ?? ROLE_PRIORITY.length;
            const bp = b.rolePriorityIndex ?? ROLE_PRIORITY.length;
            if (ap !== bp)
                return ap - bp;
            return (a.username || "").localeCompare(b.username || "");
        });
        // İsteğe bağlı filtreleme/sıralama (GLOBAL)
        let members = snapshotAll;
        // Rol filtresi (isteğe bağlı) – isim VEYA roleId
        if (roleFilterMode !== "all") {
            if (roleFilterMode === "byId") {
                members = members.filter((m) => (m.dominantRole ?? null) === roleFilterValue);
            }
            else {
                // byName – dominantRoleName yoksa Voitans varsayımı
                members = members.filter((m) => (m.dominantRoleName || "Voitans") === roleFilterValue);
            }
        }
        if (q)
            members = members.filter((m) => m.username.toLowerCase().includes(q));
        if (sort === "name") {
            members.sort((a, b) => a.username.localeCompare(b.username));
        }
        else {
            members.sort((a, b) => (a.rolePriorityIndex ?? ROLE_PRIORITY.length) - (b.rolePriorityIndex ?? ROLE_PRIORITY.length));
        }
        if (order === "desc")
            members.reverse();
        // 3) Global sıralama SONRASI sayfalama
        const total = members.length;
        const totalPages = limit >= Number.MAX_SAFE_INTEGER ? 1 : Math.max(1, Math.ceil(total / limit));
        const start = limit >= Number.MAX_SAFE_INTEGER ? 0 : (page - 1) * limit;
        const sliceMembers = members.slice(start, limit >= Number.MAX_SAFE_INTEGER ? undefined : start + limit);
        // ETag kontrolü: Aynı filtre seti için aynı snapshot ise 304 döndür.
        // Not: Page slice değişse bile snapshot rev aynı kalır; 304 sadece istemcinin slice’ı da cache’lemesi halinde faydalıdır.
        // Cache kapalı: her zaman 200 dön; 304 kullanmayalım
        // (İstenirse yine ETag bırakılabilir ama 304 faydası düşük olacak)
        // Not: İstemci tarafında eski 304 davranışı devre dışı kalır.
        // Arka plan zenginleştirme: sayfa dışı ve hydrate edilmemiş ID'ler
        const toBackground = allIds.filter((id) => !pageIds.includes(id)).filter((id) => {
            const e = enrichedMap[id];
            return !(e && e.hydratedAt && now - e.hydratedAt < hydrateTtlMs);
        });
        if (toBackground.length) {
            // Sessiz arka plan: küçük paralellik (BG_CONCURRENCY) + basit backoff
            (async () => {
                let idx = 0;
                const workers = Array.from({ length: BG_CONCURRENCY }).map(async () => {
                    let attempt = 0;
                    while (idx < toBackground.length) {
                        const id = toBackground[idx++];
                        try {
                            await hydrateOne(id, rolesById.get(id), nicksById.get(id), usersById.get(id));
                            attempt = 0; // başarılı olursa sıfırla
                            await new Promise((r) => setTimeout(r, 120));
                        }
                        catch (e) {
                            attempt++;
                            await backoff(attempt, 250);
                        }
                    }
                });
                await Promise.all(workers);
                // Arka plan tamamlandığında enriched cache’i güncelle
                setCache(enrichedCacheKey, enrichedMap, 10 * 60 * 1000);
            })();
        }
        // Cevap: global sıralı dilim + meta + wallHintCount
        const wallHintCount = Math.min(total, limit * 2); // en az 2 sayfa öner
        // Zod ile response doğrulama
        const payload = {
            members: sliceMembers,
            total,
            totalPages,
            page,
            limit,
            hydratedUntil: pageStart + pageMembers.length, // en azından bu sayfanın sonuna kadar hydrate edildi
            backgroundRefresh: toBackground.length > 0,
            wallHintCount,
        };
        const parsed = ApiResponseSchema.safeParse(payload);
        if (!parsed.success) {
            console.error("[/api/members] response validation failed", parsed.error?.issues);
            return server_1.NextResponse.json({ members: [], total: 0, totalPages: 1, error: "response-validation-failed" }, { status: 500 });
        }
        const res = server_1.NextResponse.json(parsed.data, { status: 200 });
        res.headers.set("Cache-Control", "no-store");
        res.headers.set("X-Voitans-Cache", "disabled");
        return res;
    }
    catch (e) {
        return server_1.NextResponse.json({ members: [], total: 0, totalPages: 1, error: e?.message ?? "fetch-failed" }, { status: 500 });
    }
}
