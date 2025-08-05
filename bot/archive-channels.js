// Archive multiple Discord channels (messages + optional attachments) and produce merged timeline
// Usage:
//   node discordbot/archive-channels.js --channels "114066...,1182815,...,1230980..." --prefix bdo --download
//
// Outputs:
//   output/<prefix>-ch-<id>.json         (per-channel archive)
//   output/<prefix>-merged.json          (merged chronological timeline)
//   output/<prefix>-attachments/         (all attachments downloaded here; JSONs include localPath)
//
// ENV:
//   DISCORD_BOT_TOKEN must be set (loaded via dotenv from .env.local or discordbot/.env, if present)

const fs = require("fs");
const path = require("path");
const https = require("https");

//// Load env (root .env.local -> discordbot/.env -> default)
try {
  const rootEnv = path.resolve(__dirname, "..", ".env.local");
  const botEnv = path.resolve(__dirname, ".env");
  if (fs.existsSync(rootEnv)) require("dotenv").config({ path: rootEnv });
  else if (fs.existsSync(botEnv)) require("dotenv").config({ path: botEnv });
  else require("dotenv").config();
} catch (_) {}

const DISCORD_API = "https://discord.com/api/v10";
const TOKEN = process.env.DISCORD_BOT_TOKEN;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--channels") args.channels = argv[++i];
    else if (a === "--prefix") args.prefix = argv[++i];
    else if (a === "--download") args.download = true;
    else if (a === "--max") args.max = Number(argv[++i] || "0") || 0;
  }
  return args;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${TOKEN}` },
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after")) || 1;
    await sleep(retryAfter * 1000);
    return fetchJson(url);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url} -> ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function downloadFile(url, destPath) {
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (response) => {
        const forward = (resp) => {
          resp.pipe(file);
          file.on("finish", () => file.close(() => resolve(destPath)));
        };
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          https.get(response.headers.location, forward);
        } else {
          forward(response);
        }
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => reject(err));
      });
  });
}

async function archiveOneChannel(channelId, outDir, prefix, download, maxPerChannel = 0) {
  const outJson = path.join(outDir, `${prefix}-ch-${channelId}.json`);
  const attachmentsDir = path.join(outDir, `${prefix}-attachments`);

  await fs.promises.mkdir(outDir, { recursive: true });
  if (download) await fs.promises.mkdir(attachmentsDir, { recursive: true });

  console.log(`[archive:${channelId}] start`);
  const all = [];
  let lastId = null;
  let fetched = 0;

  while (true) {
    let url = `${DISCORD_API}/channels/${channelId}/messages?limit=100`;
    if (lastId) url += `&before=${lastId}`;
    const chunk = await fetchJson(url);
    if (!Array.isArray(chunk) || chunk.length === 0) break;

    const normalized = chunk.map((m) => ({
      id: m.id,
      channel_id: m.channel_id,
      timestamp: m.timestamp,
      edited_timestamp: m.edited_timestamp || null,
      author: m.author
        ? { id: m.author.id, username: m.author.username, global_name: m.author.global_name }
        : null,
      content: m.content || "",
      attachments: (m.attachments || []).map((a) => ({
        id: a.id,
        filename: a.filename,
        size: a.size,
        url: a.url,
        proxy_url: a.proxy_url,
        content_type: a.content_type,
        width: a.width,
        height: a.height,
      })),
      embeds: (m.embeds || []).map((e) => ({
        type: e.type,
        title: e.title,
        description: e.description,
        url: e.url,
      })),
      mentions: {
        users: (m.mentions || []).map((u) => ({ id: u.id, username: u.username })),
        roles: m.mention_roles || [],
      },
      referenced_message_id: m.referenced_message ? m.referenced_message.id : null,
    }));

    all.push(...normalized);
    fetched += normalized.length;
    lastId = chunk[chunk.length - 1].id;
    console.log(`[archive:${channelId}] +${normalized.length} (total: ${fetched})`);

    if (maxPerChannel && fetched >= maxPerChannel) break;
    await sleep(450);
  }

  // download attachments
  if (download) {
    for (const m of all) {
      for (const att of m.attachments) {
        try {
          const safe = `${channelId}-${m.id}-${att.id}-${att.filename}`.replace(/[^\w.-]+/g, "_");
          const localPath = path.join(attachmentsDir, safe);
          await downloadFile(att.url, localPath);
          att.localPath = path.relative(outDir, localPath).replaceAll("\\", "/");
          console.log(`[download:${channelId}] ${att.filename} -> ${att.localPath}`);
          await sleep(120);
        } catch (e) {
          console.warn(`[download:${channelId}] failed ${att.url}: ${e.message}`);
        }
      }
    }
  }

  await fs.promises.writeFile(
    outJson,
    JSON.stringify({ channel: channelId, count: all.length, messages: all }, null, 2),
    "utf8"
  );
  console.log(`[archive:${channelId}] done -> ${outJson}`);
  return all;
}

function pickMediaFrom(messages, prefix) {
  // Convert messages to media items for UI if needed later
  const list = [];
  for (const m of messages) {
    for (const a of m.attachments || []) {
      const ext = (a.filename || "").toLowerCase();
      const isImg =
        /\.(png|jpg|jpeg|webp|gif)$/i.test(ext) || (a.content_type || "").startsWith("image/");
      const isVid =
        /\.(mp4|webm|mov)$/i.test(ext) || (a.content_type || "").startsWith("video/");
      const base = {
        id: `${m.channel_id}-${m.id}-${a.id}`,
        filename: a.filename,
        url: a.url,
        localPath: a.localPath ? `${prefix}-attachments/${path.basename(a.localPath)}` : undefined,
        timestamp: m.timestamp,
      };
      if (isImg) list.push({ ...base, type: "image" });
      else if (isVid) list.push({ ...base, type: "video" });
    }
  }
  return list.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
}

async function main() {
  const { channels, prefix = "bdo", download = false, max = 0 } = parseArgs(process.argv);
  if (!TOKEN) {
    console.error("ERROR: DISCORD_BOT_TOKEN is not set in environment.");
    process.exit(1);
  }
  if (!channels) {
    console.error('Usage: node discordbot/archive-channels.js --channels "id1,id2,..." [--prefix bdo] [--download] [--max N]');
    process.exit(1);
  }
  const ids = channels.split(",").map((s) => s.trim()).filter(Boolean);
  const outDir = path.resolve(process.cwd(), "output");
  await fs.promises.mkdir(outDir, { recursive: true });

  const merged = [];
  for (const id of ids) {
    const all = await archiveOneChannel(id, outDir, prefix, download, max);
    merged.push(
      ...all.map((m) => ({
        channel_id: m.channel_id,
        id: m.id,
        timestamp: m.timestamp,
        author: m.author,
        content: m.content,
        attachments: m.attachments,
        embeds: m.embeds,
      }))
    );
  }

  // Sort merged chronologically ascending (old -> new) for timeline use
  merged.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
  const mergedPath = path.join(outDir, `${prefix}-merged.json`);
  await fs.promises.writeFile(mergedPath, JSON.stringify({ channels: ids, count: merged.length, messages: merged }, null, 2), "utf8");
  console.log(`[merged] ${merged.length} messages -> ${mergedPath}`);

  // Optional media index for UI convenience
  const mediaIndex = pickMediaFrom(merged, prefix);
  const mediaPath = path.join(outDir, `${prefix}-media.json`);
  await fs.promises.writeFile(mediaPath, JSON.stringify({ count: mediaIndex.length, media: mediaIndex }, null, 2), "utf8");
  console.log(`[media] ${mediaIndex.length} items -> ${mediaPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
