"use strict";
/**
 * Global sabitler ve Discord role ID eşleştirmeleri
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUILD_ROLES = exports.DISCORD = void 0;
exports.DISCORD = {
    GUILD_ID: process.env.DISCORD_GUILD_ID || "",
    SENIOR_OFFICER_ROLE_ID: "1249512318929342505",
};
exports.GUILD_ROLES = {
    guildmaster: "Guild Master",
    seniorofficer: "Senior Officer",
    marshal: "Marshal",
    fieldofficer: "Field Officer",
    veteran: "Veteran",
    voitans: "Voitans",
};
