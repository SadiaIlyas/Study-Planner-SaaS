import { app } from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 StudyFlow Multi-Tenant Backend running on http://localhost:${PORT}`);
  console.log(`🛡️  Tenant Isolation & Cognito Auth Simulator active`);
  console.log(`📊 DynamoDB Storage: local JSON store / AWS fallback`);
  console.log(`====================================================`);
});
