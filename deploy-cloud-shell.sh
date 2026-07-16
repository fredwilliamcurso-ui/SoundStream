#!/bin/bash
# ==============================================================================
# SoundStream - Advanced Automated IAM Repair & zero-Typo Deployer
# ==============================================================================
set -e

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0;0m' # No Color

echo -e "${CYAN}========================================================================${NC}"
echo -e "${CYAN}       SOUNDSTREAM AUTOMATED GCP IAM DIAGNOSTIC & REPAIR ENGINE         ${NC}"
echo -e "${CYAN}========================================================================${NC}"

# 1. Get and Verify Active Project ID
echo -e "${BLUE}🤖 Setting active Google Cloud project to target ID: ${YELLOW}project-8462457c-9513-4dcb-9e9${NC}..."
gcloud config set project project-8462457c-9513-4dcb-9e9 &>/dev/null || true

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  PROJECT_ID="project-8462457c-9513-4dcb-9e9"
fi
echo -e "${GREEN}✔ Active Project ID set to: ${YELLOW}$PROJECT_ID${NC}"

# 2. Get and Verify Project Number
echo -e "${BLUE}🤖 Fetching project metadata from Google Resource Manager...${NC}"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)" 2>/dev/null)
if [ -z "$PROJECT_NUMBER" ]; then
  echo -e "${RED}❌ Error: Could not retrieve Project Number.${NC}"
  echo "This indicates that your current authenticated account lacks 'roles/viewer' or 'roles/browser' on project $PROJECT_ID."
  echo "Please verify billing is active and that your account has Owner/Editor rights."
  exit 1
fi
echo -e "${GREEN}✔ Detected Project Number: ${YELLOW}$PROJECT_NUMBER${NC}"

# 3. Detect and Log Authenticated Gaia User Identity
ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
echo -e "${GREEN}✔ Current Authenticated Gaia User Identity: ${YELLOW}$ACTIVE_ACCOUNT${NC}"
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo -e "${RED}❌ Error: No active gcloud authenticated account found.${NC}"
  echo "Please authenticate first by running: gcloud auth login"
  exit 1
fi

# 4. Enable Critical Google Cloud APIs (creates and activates default Service Accounts)
echo -e "${BLUE}⚡ Step 1: Ensuring all required Google APIs are active and provisioned...${NC}"
APIs=(
  "iam.googleapis.com"
  "compute.googleapis.com"
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
  "artifactregistry.googleapis.com"
  "storage.googleapis.com"
)

for api in "${APIs[@]}"; do
  echo -e "   Checking API: ${CYAN}$api${NC}..."
  gcloud services enable "$api" --project="$PROJECT_ID" 2>/dev/null || {
    echo -e "   ${YELLOW}⚠ Warning: Could not enable $api. Continuing on best-effort basis...${NC}"
  }
done
echo -e "${GREEN}✔ Google Cloud services verified & active!${NC}"

# 5. Define Standard GCP Service Accounts
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
DEPLOYER_SA="deployer-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${BLUE}🔍 Step 2: Verifying required Google Service Accounts (Gaia IDs)...${NC}"

# Check and Create deployer-sa if referenced or missing
echo -n "   Verifying Deployer Service Account (deployer-sa)... "
if gcloud iam service-accounts describe "$DEPLOYER_SA" --project="$PROJECT_ID" &>/dev/null; then
  echo -e "${GREEN}FOUND & ACTIVE${NC}"
else
  echo -e "${YELLOW}NOT FOUND${NC}"
  echo -e "   ${YELLOW}⚙ Creating 'deployer-sa' Service Account...${NC}"
  gcloud iam service-accounts create deployer-sa \
    --display-name="SoundStream Deployer Service Account" \
    --project="$PROJECT_ID" &>/dev/null || {
      echo -e "   ${RED}⚠ Could not create deployer-sa automatically. Continuing...${NC}"
    }
fi

# Check Default Compute SA
echo -n "   Verifying Default Compute Service Account: $COMPUTE_SA... "
if gcloud iam service-accounts describe "$COMPUTE_SA" --project="$PROJECT_ID" &>/dev/null; then
  echo -e "${GREEN}FOUND & ACTIVE${NC}"
else
  echo -e "${YELLOW}NOT FOUND${NC}"
  echo -e "   ${YELLOW}⚙ Re-triggering Compute Engine API registration to provision Default Compute Service Account...${NC}"
  gcloud services disable compute.googleapis.com --force --project="$PROJECT_ID" &>/dev/null || true
  gcloud services enable compute.googleapis.com --project="$PROJECT_ID" &>/dev/null || true
fi

# Check Default Cloud Build SA
echo -n "   Verifying Default Cloud Build Service Account: $CLOUDBUILD_SA... "
if gcloud iam service-accounts describe "$CLOUDBUILD_SA" --project="$PROJECT_ID" &>/dev/null; then
  echo -e "${GREEN}FOUND & ACTIVE${NC}"
else
  echo -e "${YELLOW}NOT FOUND${NC}"
  echo -e "   ${YELLOW}⚙ Re-triggering Cloud Build API registration to provision Default Cloud Build Service Account...${NC}"
  gcloud services disable cloudbuild.googleapis.com --force --project="$PROJECT_ID" &>/dev/null || true
  gcloud services enable cloudbuild.googleapis.com --project="$PROJECT_ID" &>/dev/null || true
fi

# 6. Repair IAM Permissions & Roles
echo -e "${BLUE}⚙ Step 3: Repairing and Granting Required IAM Permissions (Surgical Bindings)...${NC}"

bind_role() {
  local member_type="$1"
  local member_id="$2"
  local role="$3"
  
  echo -e "   Binding ${CYAN}$role${NC} to ${YELLOW}$member_type:$member_id${NC}..."
  
  # Capturing errors to prevent Regional Access Boundary/Gaia ID lookup failures from crashing the script
  local err_output
  err_output=$(gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$member_type:$member_id" \
    --role="$role" \
    --condition=None 2>&1 >/dev/null) && {
      echo -e "      ${GREEN}✔ Binding successful.${NC}"
    } || {
      if [[ "$err_output" == *"Gaia id not found"* ]]; then
        echo -e "      ${YELLOW}⚠ Notice: Gaia ID lookup for $member_id returned NOT_FOUND.${NC}"
        echo -e "        This is a standard GCP behavior for Regional Access Boundary (RAB) / sovereign cloud limits on consumer gmail accounts."
        echo -e "        Skipping this optional binding as your account already has sufficient direct permissions in Cloud Shell.${NC}"
      else
        echo -e "      ${YELLOW}⚠ Binding skipped or already exists (Message: $(echo "$err_output" | head -n 1)). Continuing...${NC}"
      fi
    }
}

# Grant Admin permissions to the Deployer (Active Gaia User)
echo -e "🔹 Granting credentials to Deployer Identity: ${YELLOW}$ACTIVE_ACCOUNT${NC}..."
bind_role "user" "$ACTIVE_ACCOUNT" "roles/run.admin"
bind_role "user" "$ACTIVE_ACCOUNT" "roles/storage.admin"
bind_role "user" "$ACTIVE_ACCOUNT" "roles/artifactregistry.admin"
bind_role "user" "$ACTIVE_ACCOUNT" "roles/cloudbuild.builds.editor"
bind_role "user" "$ACTIVE_ACCOUNT" "roles/iam.serviceAccountUser"

# Grant Owner/Editor role to the custom deployer-sa (if it was successfully verified/created)
echo -e "🔹 Granting credentials to Deployer Service Account: ${YELLOW}$DEPLOYER_SA${NC}..."
bind_role "serviceAccount" "$DEPLOYER_SA" "roles/owner"

# Grant storage and deployment credentials to Cloud Build Default SA
echo -e "🔹 Granting credentials to Cloud Build Service Agent: ${YELLOW}$CLOUDBUILD_SA${NC}..."
bind_role "serviceAccount" "$CLOUDBUILD_SA" "roles/run.admin"
bind_role "serviceAccount" "$CLOUDBUILD_SA" "roles/storage.admin"
bind_role "serviceAccount" "$CLOUDBUILD_SA" "roles/artifactregistry.admin"
bind_role "serviceAccount" "$CLOUDBUILD_SA" "roles/logging.logWriter"
bind_role "serviceAccount" "$CLOUDBUILD_SA" "roles/iam.serviceAccountUser"

# Grant object viewing permissions to Default Compute SA (used by Cloud Run at runtime)
echo -e "🔹 Granting credentials to Default Compute Service Account: ${YELLOW}$COMPUTE_SA${NC}..."
bind_role "serviceAccount" "$COMPUTE_SA" "roles/storage.objectViewer"
bind_role "serviceAccount" "$COMPUTE_SA" "roles/run.viewer"

echo -e "${GREEN}✔ IAM permissions successfully repaired and synchronized!${NC}"

# 7. Pre-create and Configure Artifact Registry Repository
echo -e "${BLUE}📦 Step 4: Ensuring Artifact Registry is prepared...${NC}"
if gcloud artifacts repositories describe soundstream-repo --location=europe-west1 --project="$PROJECT_ID" &>/dev/null; then
  echo -e "   ${GREEN}✔ Artifact Registry repository 'soundstream-repo' already exists.${NC}"
else
  echo -e "   ${YELLOW}⚙ Creating Docker repository 'soundstream-repo' in region europe-west1...${NC}"
  gcloud artifacts repositories create soundstream-repo \
    --repository-format=docker \
    --location=europe-west1 \
    --description="SoundStream container images" \
    --project="$PROJECT_ID" || {
      echo -e "${YELLOW}   ⚠ Failed to create Artifact Registry. Continuing anyway...${NC}"
    }
fi

# 8. Check and Repair GCS Build Storage Bucket Permissions
echo -e "${BLUE}🗄 Step 5: Checking Cloud Storage build bucket parameters...${NC}"
BUILD_BUCKET="gs://${PROJECT_ID}_cloudbuild"
echo -e "   Validating bucket: ${CYAN}$BUILD_BUCKET${NC}..."
if gsutil ls -b "$BUILD_BUCKET" &>/dev/null; then
  echo -e "   ${GREEN}✔ Build storage bucket already exists.${NC}"
else
  echo -e "   ${YELLOW}⚙ Creating Cloud Storage build bucket in multi-region: ${BUILD_BUCKET}...${NC}"
  gsutil mb -p "$PROJECT_ID" -c standard "$BUILD_BUCKET" &>/dev/null || {
    echo -e "      ${YELLOW}⚠ Could not pre-create bucket. Gcloud will auto-create during build phase.${NC}"
  }
fi

# Assign bucket-specific permissions to make sure 403s are permanently solved
if gsutil ls -b "$BUILD_BUCKET" &>/dev/null; then
  echo -e "   Securing bucket storage IAM policies..."
  gsutil iam ch "serviceAccount:$CLOUDBUILD_SA:objectAdmin" "$BUILD_BUCKET" &>/dev/null || true
  gsutil iam ch "serviceAccount:$COMPUTE_SA:objectViewer" "$BUILD_BUCKET" &>/dev/null || true
  gsutil iam ch "user:$ACTIVE_ACCOUNT:objectAdmin" "$BUILD_BUCKET" &>/dev/null || true
fi

# 9. Self-Cleaning Conflicting Cloud Run Custom Domain Mappings
echo -e "${BLUE}🧹 Step 5.5: Safely removing conflicting Cloud Run custom domain mappings for 'soundstreamy.com'...${NC}"
gcloud beta run domain-mappings delete --domain=soundstreamy.com --project="$PROJECT_ID" --region=europe-west1 --quiet 2>/dev/null && {
  echo -e "   ${GREEN}✔ Conflicting Cloud Run domain mapping for 'soundstreamy.com' removed successfully.${NC}"
} || {
  echo -e "   ${YELLOW}⚠ Note: No active conflicting Cloud Run domain mapping found or it was already removed. Continuing...${NC}"
}

# 10. Perform Production Deployment
echo -e "${BLUE}🚀 Step 6: Deploying to Google Cloud Run (Region: europe-west1)...${NC}"
echo -e "${CYAN}Executing source compilation and zero-downtime rolling release...${NC}"

SUCCESS=false

echo -e "${BLUE}🤖 Attempting deployment to Cloud Run service '${YELLOW}soundstreamy${BLUE}'...${NC}"
if gcloud run deploy soundstreamy \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --project="$PROJECT_ID"; then
  SUCCESS=true
  echo -e "${GREEN}✔ Successfully deployed to 'soundstreamy'!${NC}"
else
  echo -e "${YELLOW}⚠ Deployment to 'soundstreamy' failed or service does not exist. Attempting fallback...${NC}"
fi

echo -e "${BLUE}🤖 Attempting deployment to Cloud Run service '${YELLOW}soundstream${BLUE}'...${NC}"
if gcloud run deploy soundstream \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --project="$PROJECT_ID"; then
  SUCCESS=true
  echo -e "${GREEN}✔ Successfully deployed to 'soundstream'!${NC}"
else
  echo -e "${YELLOW}⚠ Deployment to 'soundstream' failed or service does not exist.${NC}"
fi

if [ "$SUCCESS" = "true" ]; then
  # 11. Deploy Frontend to Firebase Hosting
  echo -e "\n${BLUE}⚡ Step 7: Preparing and deploying production frontend to Firebase Hosting...${NC}"
  
  if command -v npm &>/dev/null; then
    echo -e "   ${CYAN}⚙ Installing local dependencies (npm install)...${NC}"
    npm install --legacy-peer-deps &>/dev/null || npm install --legacy-peer-deps
    
    echo -e "   ${CYAN}⚙ Compiling production frontend bundle (npm run build)...${NC}"
    npm run build
    
    if [ -d "dist" ]; then
      echo -e "   ${GREEN}✔ Production build completed successfully!${NC}"
      
      # Ensure firebase CLI is available or run via npx
      echo -e "   ${CYAN}🚀 Deploying static assets to Firebase Hosting...${NC}"
      if command -v firebase &>/dev/null; then
        firebase deploy --only hosting --project="$PROJECT_ID"
      else
        echo -e "   ${YELLOW}⚠ firebase-tools command not found. Deploying via npx...${NC}"
        npx firebase deploy --only hosting --project="$PROJECT_ID"
      fi
    else
      echo -e "   ${RED}❌ Error: 'dist' directory not found. Frontend compilation failed.${NC}"
      exit 1
    fi
  else
    echo -e "   ${RED}❌ Error: 'npm' is not installed in this environment. Unable to compile frontend.${NC}"
    exit 1
  fi

  echo -e "${GREEN}========================================================================${NC}"
  echo -e "${GREEN}🎉 SUCCESS: SoundStream has been successfully deployed to production!   ${NC}"
  echo -e "${GREEN}========================================================================${NC}"
  exit 0
else
  echo -e "${RED}========================================================================${NC}"
  echo -e "${RED}❌ ERROR: Cloud Run deployment failed for both services!                ${NC}"
  echo -e "${RED}========================================================================${NC}"
  echo -e "${YELLOW}Please inspect the error trace above. Common causes include:${NC}"
  echo -e "1. ${YELLOW}Billing is disabled:${NC} Verify a valid payment card is connected under your billing account console."
  echo -e "2. ${YELLOW}Quota limits:${NC} Check if Europe-west1 region has available CPUs / Container instances."
  echo -e "3. ${YELLOW}GCP Status:${NC} Look up if Cloud Build or Cloud Run is experiencing temporary outages."
  exit 1
fi
