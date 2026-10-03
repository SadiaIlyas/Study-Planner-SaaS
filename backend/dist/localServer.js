"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 4000;
app_1.app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 StudyFlow Multi-Tenant Backend running on http://localhost:${PORT}`);
    console.log(`🛡️  Tenant Isolation & Cognito Auth Simulator active`);
    console.log(`📊 DynamoDB Storage: local JSON store / AWS fallback`);
    console.log(`====================================================`);
});
