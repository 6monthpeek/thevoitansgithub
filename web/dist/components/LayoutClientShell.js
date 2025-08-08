"use client";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LayoutClientShell;
const jsx_runtime_1 = require("react/jsx-runtime");
const AuthSessionProvider_1 = __importDefault(require("./AuthSessionProvider"));
const AuthButton_1 = __importDefault(require("./AuthButton"));
/**
 * Client-only shell:
 * - NextAuth SessionProvider
 * - Global AuthButton
 * - Children (app content)
 */
function LayoutClientShell({ children }) {
    return ((0, jsx_runtime_1.jsxs)(AuthSessionProvider_1.default, { children: [(0, jsx_runtime_1.jsx)("div", { className: "fixed top-3 right-3 z-50", children: (0, jsx_runtime_1.jsx)(AuthButton_1.default, {}) }), children] }));
}
