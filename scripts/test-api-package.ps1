# Requires PowerShell 5.1+

$ErrorActionPreference = "Stop"

# Get environment variables
$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$SupabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY
$ApiUrl = "http://localhost:3000/api/app-package"

if (-not $SupabaseUrl -or -not $SupabaseKey) {
    Write-Host "Erreur: Les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies." -ForegroundColor Red
    throw "Missing environment variables"
}

Write-Host "==============================================="
Write-Host "Test de l'endpoint POST /api/app-package"
Write-Host "==============================================="
Write-Host ""

# Headers for Supabase REST API
$SupabaseHeaders = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
}

Write-Host "1. Récupération des données depuis Supabase..."

# 1. Get first valid job_id
$JobsUrl = "$SupabaseUrl/rest/v1/jobs?select=id&limit=1"
try {
    $JobsResponse = Invoke-RestMethod -Uri $JobsUrl -Headers $SupabaseHeaders -Method Get
    if ($JobsResponse.Count -eq 0) {
        throw "Aucun job trouvé dans la base"
    }
    $JobId = $JobsResponse[0].id
    Write-Host "✅ Job_id récupéré : $JobId" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération du job : $_" -ForegroundColor Red
    throw $_
}

# 2. Get first valid user_id (who has a resume preferably)
$ResumesUrl = "$SupabaseUrl/rest/v1/base_resumes?select=user_id&limit=1"
try {
    $ResumesResponse = Invoke-RestMethod -Uri $ResumesUrl -Headers $SupabaseHeaders -Method Get
    if ($ResumesResponse.Count -eq 0) {
        throw "Aucun CV trouvé dans la base"
    }
    $UserId = $ResumesResponse[0].user_id
    Write-Host "✅ User_id récupéré : $UserId" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la récupération du user : $_" -ForegroundColor Red
    throw $_
}

Write-Host ""
Write-Host "2. Lancement des appels de test..."
Write-Host ""

# Helper function to make requests
function Test-ApiCall {
    param (
        [string]$TestName,
        [string]$Method,
        [string]$Body,
        [int]$ExpectedStatusCode,
        [string]$ExpectedContent
    )

    Write-Host "Test: $TestName" -NoNewline

    $Params = @{
        Uri = $ApiUrl
        Method = $Method
        UseBasicParsing = $true
    }

    if ($Body) {
        $Params.Body = $Body
        $Params.ContentType = "application/json"
    }

    $Passed = $true
    $Reason = ""

    try {
        $Response = Invoke-WebRequest @Params
        $StatusCode = $Response.StatusCode
        $Content = $Response.Content
    } catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        if ($null -eq $StatusCode) { $StatusCode = 500 }

        $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $Content = $Reader.ReadToEnd()
    }

    # Custom checks depending on test cases
    if ($ExpectedContent -eq "405 Method Not Allowed") {
        if ($StatusCode -ne 405) {
            $Passed = $false
            $Reason = "Expected 405, got $StatusCode"
        }
    } elseif ($ExpectedContent -eq "Missing job_id or user_id") {
        if ($Content -notmatch "Missing job_id or user_id") {
            $Passed = $false
            $Reason = "Expected 'Missing job_id or user_id', got $Content"
        }
    } elseif ($ExpectedContent -eq "Job not found") {
        if ($Content -notmatch "Job not found") {
            $Passed = $false
            $Reason = "Expected 'Job not found', got $Content"
        }
    } elseif ($ExpectedContent -eq "Internal error") {
        if ($Content -notmatch "Internal error") {
            $Passed = $false
            $Reason = "Expected 'Internal error', got $Content"
        }
    } elseif ($ExpectedContent -eq "Success") {
        if ($Content -notmatch '"success":true') {
            $Passed = $false
            $Reason = "Expected success, got $Content"
        }
    }

    if ($Passed) {
        Write-Host " - ✅ SUCCESS" -ForegroundColor Green
    } else {
        Write-Host " - ❌ FAILED: $Reason" -ForegroundColor Red
    }
}


# Test 1: GET Request (Method Not Allowed)
Test-ApiCall -TestName "GET endpoint /api/app-package" -Method "GET" -Body "" -ExpectedStatusCode 405 -ExpectedContent "405 Method Not Allowed"

# Test 2: POST without body (Validation error)
Test-ApiCall -TestName "POST sans body" -Method "POST" -Body "" -ExpectedStatusCode 500 -ExpectedContent "Internal error"

# Test 3: POST with missing job_id (Validation error)
$BodyNoJobId = '{"user_id": "' + $UserId + '"}'
Test-ApiCall -TestName "POST avec job_id manquant" -Method "POST" -Body $BodyNoJobId -ExpectedStatusCode 200 -ExpectedContent "Missing job_id or user_id"

# Test 4: POST with missing user_id (Validation error)
$BodyNoUserId = '{"job_id": "' + $JobId + '"}'
Test-ApiCall -TestName "POST avec user_id manquant" -Method "POST" -Body $BodyNoUserId -ExpectedStatusCode 200 -ExpectedContent "Missing job_id or user_id"

# Test 5: POST with fake ids (Job not found)
$BodyFakeIds = '{"job_id": "00000000-0000-0000-0000-000000000000", "user_id": "00000000-0000-0000-0000-000000000000"}'
Test-ApiCall -TestName "POST avec faux IDs" -Method "POST" -Body $BodyFakeIds -ExpectedStatusCode 200 -ExpectedContent "Job not found"

# Test 6: POST with valid ids (Success)
$BodyValid = '{"job_id": "' + $JobId + '", "user_id": "' + $UserId + '"}'
Test-ApiCall -TestName "POST avec IDs valides (Succès attendu)" -Method "POST" -Body $BodyValid -ExpectedStatusCode 200 -ExpectedContent "Success"

Write-Host ""
Write-Host "==============================================="
Write-Host "Tests terminés."
Write-Host "==============================================="
