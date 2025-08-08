"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.runtime = void 0;
const next_auth_1 = __importDefault(require("next-auth"));
const auth_1 = require("@/lib/auth");
// NextAuth App Router minimal adapter.
// Replit/proxy uyumu için kesin Node.js runtime kullan.
exports.runtime = "nodejs";
const handler = (0, next_auth_1.default)(auth_1.authOptions);
exports.GET = handler;
exports.POST = handler;
