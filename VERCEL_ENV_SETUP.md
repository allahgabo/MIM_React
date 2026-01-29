# 🔧 Vercel Environment Variables Setup

## ⚠️ CRITICAL: Your production deployment is failing because environment variables are not set in Vercel.

**Error:** `SNOWFLAKE_ACCOUNT environment variable not set`

**Solution:** Add environment variables to Vercel dashboard (takes 2-3 minutes)

---

## Step-by-Step Setup

### Step 1: Go to Vercel Dashboard
1. Open: https://vercel.com/dashboard
2. Click on your **mim-react** project
3. Click **Settings** tab (top right)
4. Click **Environment Variables** (left sidebar)

### Step 2: Add Server-Side Secrets

**You need to add these 4 variables:**

#### Variable 1: SNOWFLAKE_ACCOUNT
- **Name:** `SNOWFLAKE_ACCOUNT`
- **Value:** `A3615210430571-BM71673`
- **Environments:** Production, Preview, Development (select all 3)
- **Click:** "Add"

#### Variable 2: SNOWFLAKE_USER
- **Name:** `SNOWFLAKE_USER`
- **Value:** `ali`
- **Environments:** Production, Preview, Development (select all 3)
- **Click:** "Add"

#### Variable 3: SNOWFLAKE_ROLE
- **Name:** `SNOWFLAKE_ROLE`
- **Value:** `ACCOUNTADMIN`
- **Environments:** Production, Preview, Development (select all 3)
- **Click:** "Add"

#### Variable 4: SNOWFLAKE_RSA_PASSPHRASE
- **Name:** `SNOWFLAKE_RSA_PASSPHRASE`
- **Value:** (leave empty - just copy/paste nothing)
- **Environments:** Production, Preview, Development (select all 3)
- **Click:** "Add"

#### Variable 5: SNOWFLAKE_PRIVATE_KEY_BASE64
- **Name:** `SNOWFLAKE_PRIVATE_KEY_BASE64`
- **Value:** (Copy the entire base64 string below)
- **Environments:** Production, Preview, Development (select all 3)
- **Click:** "Add"

---

## Your Base64-Encoded RSA Key

**Copy the entire text below (including the check for length: should be ~2000 characters):**

```
LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRREYveHNkZGhTZDRnSjEKdCsvcGhrMTZhNGVqbHUwaGkzZmY2ZCs4U3FoYlVyWXE4VWh3NGFLY290NGVMc1dFUDRVWkpzV1JrWkhEZSs0bQphR2ZZd2wxeE5iTGY2Mmd3WmlwdHdoNHBTTWJCczM0SGZ5SWpNaVlZYjZaQ3hCT0QwVEpqTnBrcUhkV2JrTHpoCncvNnkxSXFiVThtVFEzSkdnM1R2ZVU5T2cweFpHaWs1d04xakx2Z1g1Ri9kUGh4NThZUWhhZ090dFZ0K1owZlAKa2pua1lpU2pGOHJsRUM3Z2pKVVN6MUhMRkJmMk42bE80dFB3WXpDYnpiaG1XVHJFUDNhTGtBQWVwZWVkQ3RsZQpoSk9oUzUrWjFHNCtQRjRVQVFPRjRqK0VaKytmYkl4dFU2c0d4SE1sYmlubVdDekdwM0NuSnIvNmNlSGhiZ3kwCnpqQVdUdURQQWdNQkFBRUNnZ0VBRkFtbnpGajlhQ2NOMmEwR1RpdGwzdXhQKzFuVVlNODFFQWVpdVhNU3k3ODQKcVdybXltbkRZN2ZGNCtjVzNUWHllZU9uSGY3Tjhpc3lKRmZ2bm91NUdqSjFpbHpRSEFuUzVHMi9VSzFKVkNRZQpycEtLdVdZalhkaTZ5a24rc1puenovK2dDNWVlWFJLT1V3amJWMnpVSkRrY0R0ZkdFbVhPYVVmdEkwUjlid3pkCmNmTVlKMXZJUUI3b3FCTFBmZ2QrMHdSWnNKYzl1WHhMdVdKR1B3TE9YWnU2eWxvVU0rNzh4M0ExM2cvWEp0U0QKcDhkd1FCYXVtK2R3RExNTFROeEloTDZieEh4NWFMR0Y2V1FtTndPYXBwbHdjL0lGNHdrVUQ5RXhxa2dwWjVveQpYVGlTWjQ0Zk16VTBBOUVpYjloQ1hDeklBUHpkNUtVVE5GNTE3UTB6VVFLQmdRRDRaYXV3bkNwNUl1MzVuTGtHCi83c0hzUnVXZE9pQnpEVE5QbEJ2R2Q5MkZSNS8vdm9PSUhWL3EyQjM5RjZHRUJrNStwOXZ1U2ZCa0NsMzY5bk8KdExMcUNMeFNpMHZ6VjJ0YjdGU3dzL0h4SFcrUHNEcU5qYmw5RlU4OEZPbHZReTlSZzRGNFV1SXBNZEVmdkJBQQo1Uy9vNUFDZWxjYzNNeHZZbTl4K2YvaTVzUUtCZ1FETURvU3VGUGZqdUdDSVg0alRTYy9JYi9QRmppU0RYUUxTCldlaGxCRlAyeGo3b1d2d21SUFN2Uzkva1ludTBHL25KYktkSURyN2o2cFN0NzhZSmJYNHRCTnVsNUJhem1FaG8KeDd5Y0p0bEhrNGVweThPM2xveTZMeVFmWVpzSmk4bXJhTzBZakRsQ1dyc3gvMUVZMVdEVHI4NVZNMDRZTHJmTQplOWc2SUdWaWZ3S0JnRmxHSVRpdVI4MlZzalhlRDlubUcxQWVaUzNrQXBSejBoNVo0UXF0SDlVT3JoR09rRXgzCmVnTlNrcTlLRXBiWVFsaktMSGM0OG9Mc3p4cWNsNEZsREZCMHAwcDdhZWFoYXFKMUE5TW1PVFJSUWdGQWN5cmcKM3VPSHZ4eDIzNWJ2YkpnOVRWRHphUGtwUUdISmMyNys4QU1odnQ5QU1ZTXpTVFRHZjY2dlM3TmhBb0dBTjI1KwpObmYxdXdPY0hZK3VNSTl0aFdwOEV4K0E1YnAvaUxycHVYOUtlOC93eU5mbWhWTFlFVUtRU0k5RVFYSVVFZGFWClBxcmF5amt3T0d2WkpUaDhQU2lEcm5YZWdOME9Wb0JqeVJ0NGpNd1QzMWsrQ29JNEtsK2g5WEJqV0YyRDVDOTEKc09SdXJZck9MVS9KTFBEU0E4OVBRcS9VT0JlQTBHaVlIWG90Y0dzQ2dZRUE4KzZ4Sm5GSmJJeTVTNkFreDlBawphWGhNaFE3UXJVMXhwbmNnbzVEeGVqemxScWFCbkJXWjNaWmcxdHpSY3pXc3EwSE0vNkhBOVp2YWFoZVYrUW50CmRpRDhCV1B5YVFhVkltVHg1RzZrMW1RNFExd2J4a211ajhKMFRhck1aVis3OVg4bm5NRFh1RkJmVmZHTlk4MXAKVzU3RjdBM2ROUVBrU0hCODF3b1RvYWM9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K
```

---

## Step 3: Save and Trigger Redeploy

1. After adding all 5 environment variables, Vercel should ask "Redeploy?"
   - Click **"Redeploy"** if it asks
   - If not, go to **Deployments** tab and manually redeploy

2. Wait 1-2 minutes for deployment to complete

3. Check deployment status in the **Deployments** tab

---

## Step 4: Test Production

Once deployment completes:

### Test JWT Endpoint
```bash
curl https://mim-react-s0v2a36pw-allahgabos-projects.vercel.app/api/jwt
```

**Expected response:**
```json
{"token":"eyJhbGc...", "expiresAt": 1234567890}
```

**If still getting error:**
```json
{"error":"SNOWFLAKE_ACCOUNT environment variable not set"}
```
👉 This means redeployment didn't complete. Wait another minute and refresh.

### Test Chat Interface
1. Open: https://mim-react-s0v2a36pw-allahgabos-projects.vercel.app
2. Open DevTools (F12 → Console tab)
3. Type message: "Hello"
4. Should see in console:
   - `🚀 [Agent API] POST ...`
   - `✅ [Agent API] Response status: 200`

---

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Go to Vercel → Settings → Environment Variables | 1 min |
| 2 | Add 5 environment variables (copy/paste values) | 2 min |
| 3 | Click Redeploy | 1-2 min |
| 4 | Test JWT endpoint & chat | 1 min |
| **Total** | | **5-6 minutes** |

---

## 🚀 After This Setup

Your production app will:
- ✅ Generate JWT tokens correctly
- ✅ Connect to Snowflake Cortex Agent
- ✅ Accept messages and stream responses
- ✅ Show comprehensive debug logs

**You'll be live in production!** 🎉
