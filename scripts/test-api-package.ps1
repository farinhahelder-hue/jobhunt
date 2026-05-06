# scripts/test-api-package.ps1

$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$ServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
$LocalApiUrl = "http://localhost:3000/api/app-package"

if (-not $SupabaseUrl -or -not $ServiceKey) {
    Write-Host "❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set." -ForegroundColor Red
    exit 1
}

$Headers = @{
    "apikey" = $ServiceKey
    "Authorization" = "Bearer $ServiceKey"
}

Write-Host "🔍 Fetching a valid Job ID and User ID from Supabase..."

# 1. Fetch Job ID
$JobsResponse = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/jobs?select=id&limit=1" -Method Get -Headers $Headers
if (-not $JobsResponse -or $JobsResponse.Count -eq 0) {
    Write-Host "❌ Error: Could not find any jobs in the database." -ForegroundColor Red
    exit 1
}
$JobId = $JobsResponse[0].id

# 2. Fetch User ID
$UsersResponse = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/user_profiles?select=user_id&limit=1" -Method Get -Headers $Headers
if (-not $UsersResponse -or $UsersResponse.Count -eq 0) {
    Write-Host "❌ Error: Could not find any users in the database." -ForegroundColor Red
    exit 1
}
$UserId = $UsersResponse[0].user_id

Write-Host "✅ Found Job ID: $JobId" -ForegroundColor Green
Write-Host "✅ Found User ID: $UserId" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting Local API Tests ($LocalApiUrl)..."

$TotalTests = 5
$PassedTests = 0

function Run-Test {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Body,
        [int]$ExpectedStatusCode,
        [scriptblock]$ValidationBlock
    )

    Write-Host "Running: $TestName" -NoNewline

    try {
        $Params = @{
            Uri = $LocalApiUrl
            Method = $Method
            UseBasicParsing = $true
            ErrorAction = 'Stop'
        }

        if ($Body) {
            $Params.Body = $Body
            $Params.ContentType = "application/json"
        }

        $Response = Invoke-WebRequest @Params
        $StatusCode = $Response.StatusCode
        $Content = $Response.Content
    } catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        $Content = ""
        if ($_.Exception.Response) {
            $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $Reader.BaseStream.Position = 0
            $Reader.DiscardBufferedData()
            $Content = $Reader.ReadToEnd()
        }
    }

    if ($StatusCode -eq $ExpectedStatusCode) {
        $JsonObj = $null
        if ($Content) {
            try { $JsonObj = $Content | ConvertFrom-Json } catch {}
        }

        $PassedValidation = $true
        if ($ValidationBlock -and $JsonObj) {
            $PassedValidation = & $ValidationBlock $JsonObj
        }

        if ($PassedValidation) {
            Write-Host " - ✅ PASSED (Status: $StatusCode)" -ForegroundColor Green
            $script:PassedTests++
        } else {
            Write-Host " - ❌ FAILED VALIDATION (Status: $StatusCode)" -ForegroundColor Red
            Write-Host "Response: $Content" -ForegroundColor Gray
        }
    } else {
        Write-Host " - ❌ FAILED (Expected Status: $ExpectedStatusCode, Got: $StatusCode)" -ForegroundColor Red
        Write-Host "Response: $Content" -ForegroundColor Gray
    }
}

# Test 1: GET method
Run-Test -TestName "GET on endpoint" -Method "GET" -Body "" -ExpectedStatusCode 405 -ValidationBlock {
    param($Response)
    return $Response.success -eq $false -and $Response.error -eq 'Method Not Allowed'
}

# Test 2: POST missing body
Run-Test -TestName "POST missing body" -Method "POST" -Body "" -ExpectedStatusCode 400 -ValidationBlock {
    param($Response)
    return $Response.success -eq $false -and $Response.error -eq 'Invalid JSON body'
}

# Test 3: POST missing job_id
Run-Test -TestName "POST missing job_id" -Method "POST" -Body "{`"user_id`":`"$UserId`"}" -ExpectedStatusCode 400 -ValidationBlock {
    param($Response)
    return $Response.success -eq $false -and $Response.error -eq 'Missing job_id or user_id'
}

# Test 4: POST fake IDs
Run-Test -TestName "POST fake IDs" -Method "POST" -Body "{`"job_id`":`"00000000-0000-0000-0000-000000000000`", `"user_id`":`"00000000-0000-0000-0000-000000000000`"}" -ExpectedStatusCode 200 -ValidationBlock {
    param($Response)
    return $Response.success -eq $false -and $Response.error -eq 'Job not found'
}

# Test 5: POST valid IDs
Run-Test -TestName "POST valid IDs" -Method "POST" -Body "{`"job_id`":`"$JobId`", `"user_id`":`"$UserId`"}" -ExpectedStatusCode 200 -ValidationBlock {
    param($Response)
    return $Response.success -eq $true -and $Response.application_package -ne $null
}

Write-Host ""
Write-Host "📊 Results: $PassedTests / $TotalTests tests passed."
if ($PassedTests -eq $TotalTests) {
    Write-Host "🎉 All tests passed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️ Some tests failed." -ForegroundColor Yellow
    exit 1
}
