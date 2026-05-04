# FlowAI Self-Verification Engine — Step-by-Step Instructions

## FOR NON-TECHNICAL USERS

This guide explains how to run the autonomous Self-Verification Engine and capture proof of execution.

---

## SECTION 1: BEFORE YOU START

### Prerequisites (Check These)

1. **OPENAI_API_KEY Secret**
   - Location: Dashboard → Settings → Environment Variables
   - Status: Check if `OPENAI_API_KEY` is set
   - If missing: Add your OpenAI API key from https://platform.openai.com/api-keys

2. **VERCEL_TOKEN Secret**
   - Location: Dashboard → Settings → Environment Variables
   - Status: Check if `VERCEL_TOKEN` is set
   - If missing: Generate from https://vercel.com/account/tokens
   - Add token to environment variables

3. **Backend Functions Deployed**
   - These functions must be callable:
     - `selfVerificationEngine`
     - `generateCode`
     - `deployApp`
     - `behavioralValidation`
     - `auditDeployment`
     - `fixAndRedeploy`
   - Status: Automatically deployed by the platform

---

## SECTION 2: ACCESSING THE VERIFICATION PAGE

### Step 1: Navigate to Self-Verification Page
1. In your app preview (right side), look at the URL
2. Add `/self-verification` to the URL
   - Example: `https://your-app.base44.com/self-verification`
3. Press Enter or click the link

### Step 2: Confirm Page Loaded
- You should see a page titled "Self-Verification Engine"
- Below it: "Autonomous loop: build → test → fix → redeploy until all apps pass"
- A blue button labeled "Start Self-Verification Loop"

---

## SECTION 3: RUNNING THE ENGINE

### Step 1: Click the Start Button
1. Look for the blue button: **"Start Self-Verification Loop"**
2. Click it once (wait for it to activate)
3. The button will change to: **"Verification Running..."**

### Step 2: Watch for Status Updates
- **Current Step** box will update in real-time
- Shows what the engine is doing at each moment

Expected progression:
```
1. Initializing...
2. Checking API connectivity...
3. Loading app configurations...
4. Invoking selfVerificationEngine...
5. Processing results...
```

### Step 3: Monitor the Execution Log
- Below the button, a **"Execution Log"** panel appears
- Shows real-time timestamped messages
- Look for these patterns:

**SUCCESS (Green) Messages:**
```
[HH:MM:SS] ✓ Self-Verification Engine started
[HH:MM:SS] ✓ API keys configured
[HH:MM:SS] ✓ 5 apps ready for verification: Buffer, ContentGenius, ShopHub, BlogHub, NotionHub
```

**RUNNING (Gray) Messages:**
```
[HH:MM:SS] → Checking OPENAI_API_KEY availability
[HH:MM:SS] → Loading 5 app contexts
[HH:MM:SS] → Calling backend function: selfVerificationEngine
```

**FAILURE (Red) Messages:**
```
[HH:MM:SS] ✗ ERROR: [specific error message]
[HH:MM:SS] Check that backend functions are deployed and callable
```

---

## SECTION 4: WHAT TO EXPECT DURING EXECUTION

### For Each App (5 apps total):
The engine runs an autonomous loop:

1. **Generate Code**
   - Creates HTML/JavaScript app code
   - Log: `→ Generating code for [AppName]...`

2. **Deploy**
   - Uploads to Vercel
   - Log: `→ Deploying to Vercel...`
   - Success: `✓ [AppName] deployed to https://...`

3. **Test (Behavioral Validation)**
   - Checks: Page load, navigation, forms, CRUD, persistence, mobile layout
   - Log: `→ Running behavioral validation tests...`

4. **Audit**
   - Checks: API endpoints, critical issues, UX quality
   - Log: `→ Running audit...`

5. **Evaluate**
   - Compares against success criteria
   - If all pass: `✓ [AppName] PASSED after N iteration(s)`
   - If fails: `→ Fixing failures...`

6. **Fix & Redeploy (if needed)**
   - Automatically fixes detected issues
   - Redeploys fixed version
   - Retests
   - Repeats up to 5 times

---

## SECTION 5: INTERPRETING THE RESULTS

### Success Indicators
- Log ends with: `✓ FINAL RESULT: 5/5 APPS PASSED`
- All app results show: `✓ [AppName] PASSED`
- Summary box shows: **"5/5 Apps Verified"** (in green)

### Partial Success
- Some apps pass, some fail
- Example: `✓ FINAL RESULT: 3/5 APPS PASSED`
- Check individual app results for which ones failed

### Failure Indicators
- Log contains: `✗ ERROR: [specific error]`
- Common issues:
  - `Missing API key`: Add OPENAI_API_KEY to environment variables
  - `Deployment failed`: Check VERCEL_TOKEN is valid
  - `Function not callable`: Ensure backend functions are deployed

---

## SECTION 6: CAPTURING THE EXECUTION REPORT

### Option A: Copy Execution Log
1. In the "Execution Log" panel, click the **copy icon** (top right)
2. A message says "Execution log copied to clipboard"
3. Paste into a text file or document
4. Save as `execution-log.txt`

### Option B: Download Full Report
1. In the "Execution Log" panel, click the **download icon** (top right)
2. A file `flowai-verification-YYYY-MM-DD.json` downloads
3. This contains:
   - All app results
   - Iteration logs
   - Failure analysis
   - Final URLs
   - Execution timestamps

### Option C: Take Screenshots
1. Screenshot of the execution log panel
2. Screenshot of each app result (click to expand)
3. Screenshot of the final summary

---

## SECTION 7: CHECKING INDIVIDUAL APP RESULTS

### Expand an App Result
1. Each app shows as a card with name and status
2. Click anywhere on the card to expand
3. Expanded view shows:
   - **Live URL**: Click to open the deployed app
   - **Validation Results**: Checkmarks for each test
   - **Iteration Log**: What happened in each iteration

### What to Look For
- Green checkmarks (✓) = test passed
- Red X marks (✗) = test failed
- Iteration log shows: `Iteration N: [step] ✓` or `✗`

---

## SECTION 8: TROUBLESHOOTING

### Problem: Button doesn't respond
- **Fix**: Reload the page and try again
- Check browser console (F12) for errors

### Problem: "Verification Error" message appears
- **Check**: 
  1. OPENAI_API_KEY is set in environment variables
  2. VERCEL_TOKEN is set in environment variables
  3. Backend functions are deployed (check Functions page)
- **Fix**: Add missing secrets and try again

### Problem: Apps get stuck "Processing results..."
- **Fix**: Wait up to 2-3 minutes per app (5 apps = ~15 minutes max)
- If still stuck: Reload page and check browser console

### Problem: "Function not callable" error
- **Check**: 
  1. Navigate to Functions page
  2. Verify `selfVerificationEngine` function exists
  3. Check if other functions (generateCode, deployApp, etc.) exist
- **Fix**: Ensure all backend functions are deployed

### Problem: Apps fail with "Deployment failed"
- **Check**: VERCEL_TOKEN is valid and has proper permissions
- **Fix**: 
  1. Get new token from https://vercel.com/account/tokens
  2. Update VERCEL_TOKEN in environment variables
  3. Retry verification

---

## SECTION 9: FINAL VALIDATION CHECKLIST

When verification completes, confirm:

- [ ] Execution log shows `✓ Self-Verification Engine started`
- [ ] All 5 apps listed: Buffer, ContentGenius, ShopHub, BlogHub, NotionHub
- [ ] Each app shows iteration count (usually 1-5)
- [ ] At least some apps show `✓ PASSED`
- [ ] Each passed app has a `Final URL` link
- [ ] Summary shows results (e.g., "5/5 Apps Verified" or "3/5 Apps Verified")
- [ ] No critical errors in log (except for known failures being fixed)
- [ ] Execution log was copied/downloaded successfully

---

## SECTION 10: PROVING EXECUTION HAPPENED

To prove the engine actually ran (not simulated):

1. **Log timestamps** - Each line has `[HH:MM:SS]` showing real time progression
2. **Function calls** - Log shows `→ Calling backend function: selfVerificationEngine`
3. **Deployment URLs** - Each app has a real Vercel deployment URL
4. **Iteration details** - Log shows `Iteration 1:`, `Iteration 2:`, etc. (actual retries)
5. **API responses** - Behavioral and audit validation show real test results
6. **State changes** - From "Running..." to "Processing results..." to "Passed" (real state flow)

---

## NEXT STEPS

After verification completes:

1. **If all apps passed:**
   - Export the report
   - All 5 final URLs are ready for use
   - FlowAI Self-Verification is complete ✓

2. **If some apps failed:**
   - Check the execution log for which ones failed
   - Review the failure reasons
   - Fix blockers (missing API keys, etc.)
   - Run verification again

3. **Share Results:**
   - Download the JSON report
   - Share execution log
   - Include final URLs

---

## ESTIMATED TIME

- **Per App**: 1-3 minutes (includes generation, deployment, testing, potential fixes)
- **5 Apps Total**: 5-15 minutes
- **Full execution**: ~20 minutes worst case (if all 5 iterations per app)

---

## SUCCESS DEFINITION

FlowAI Self-Verification succeeds when:
✓ All 5 apps run through the loop
✓ Each app tests, fixes failures automatically, and redeploys
✓ Final log shows `✓ FINAL RESULT: [X]/5 APPS PASSED`
✓ Real execution proof in log (timestamps, function calls, deployments)
✓ All passed apps have live URLs
✓ Full report exported and captured