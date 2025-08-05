/**
 * Global sabitler ve Discord role ID eşleştirmeleri
 */

export const DISCORD = {
  GUILD_ID: process.env.DISCORD_GUILD_ID || "",
  SENIOR_OFFICER_ROLE_ID: "1249512318929342505",
} as const;

export const GUILD_ROLES = {
  guildmaster: "Guild Master",
  seniorofficer: "Senior Officer",
  marshal: "Marshal",
  fieldofficer: "Field Officer",
  veteran: "Veteran",
  voitans: "Voitans",
} as const;
