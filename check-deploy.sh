#!/bin/bash
# Pre-deployment checks for Vercel

echo "🚀 Deep Search Agent - Pre-Deployment Checks"
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to print check result
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((CHECKS_FAILED++))
    fi
}

# Check if bun is installed
echo "Checking prerequisites..."
bun --version > /dev/null 2>&1
check_result $? "Bun is installed"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    check_result 0 "Dependencies installed"
else
    check_result 1 "Dependencies NOT installed (run: bun install)"
fi

# Check if .env file exists
if [ -f ".env" ]; then
    check_result 0 ".env file exists"
else
    check_result 1 ".env file missing (copy from .env.example)"
fi

echo ""
echo "Running code checks..."

# Type check
bun run typecheck > /dev/null 2>&1
check_result $? "TypeScript types are valid"

# Lint check
bun run lint > /dev/null 2>&1
check_result $? "ESLint passes"

# Build check
echo "Testing production build..."
bun run build > /dev/null 2>&1
check_result $? "Production build succeeds"

echo ""
echo "Checking required files..."

# Check for important files
FILES=(
    "vercel.json"
    ".vercelignore"
    "next.config.js"
    "package.json"
    "src/env.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_result 0 "$file exists"
    else
        check_result 1 "$file missing"
    fi
done

echo ""
echo "Checking environment variables..."

# Check if critical env vars are set
REQUIRED_VARS=(
    "GOOGLE_GENERATIVE_AI_API_KEY"
    "DATABASE_URL"
    "REDIS_URL"
    "SERPER_API_KEY"
    "AUTH_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env 2>/dev/null; then
        value=$(grep "^$var=" .env | cut -d '=' -f2)
        if [ -n "$value" ] && [ "$value" != "your-" ] && [ "$value" != "placeholder" ]; then
            check_result 0 "$var is set"
        else
            check_result 1 "$var is not configured"
        fi
    else
        check_result 1 "$var is missing"
    fi
done

echo ""
echo "============================================"
echo -e "Checks passed: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "Checks failed: ${RED}${CHECKS_FAILED}${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy to Vercel.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Commit your changes: git add . && git commit -m 'Ready for deployment'"
    echo "2. Push to GitHub: git push origin main"
    echo "3. Deploy to Vercel: vercel --prod"
    echo ""
    echo "Or visit https://vercel.com/new to import from GitHub"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix the issues above before deploying.${NC}"
    echo ""
    echo "For help, check:"
    echo "- VERCEL_DEPLOYMENT_GUIDE.md - Full deployment guide"
    echo "- QUICK_DEPLOY.md - Quick reference"
    echo "- DEPLOYMENT_NOTES.md - Important notes"
    exit 1
fi
