"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthSessionProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("next-auth/react");
function AuthSessionProvider({ children, }) {
    return (0, jsx_runtime_1.jsx)(react_1.SessionProvider, { children: children });
}
