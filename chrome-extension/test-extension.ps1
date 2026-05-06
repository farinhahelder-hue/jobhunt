# Configuration
$ApiUrl = "http://localhost:3000/api/jobs/save"
$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$SupabaseKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
$Email = $env:SUPABASE_TEST_EMAIL
$Password = $env:SUPABASE_TEST_PASSWORD

Write-Host "====================================="
Write-Host "Chrome Extension E2E API Test Script"
Write-Host "====================================="

if ([string]::IsNullOrEmpty($Email) -or [string]::IsNullOrEmpty($Password)) {
    Write-Host "❌ Error: SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD must be set in environment" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrEmpty($SupabaseUrl) -or [string]::IsNullOrEmpty($SupabaseKey)) {
    Write-Host "❌ Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment to fetch token" -ForegroundColor Red
    exit 1
}

Write-Host "1. Getting JWT Token from Supabase..."

$AuthBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

$AuthHeaders = @{
    "apikey" = $SupabaseKey
    "Content-Type" = "application/json"
}

try {
    $AuthResponse = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/auth/v1/token?grant_type=password" -Headers $AuthHeaders -Body $AuthBody
    $AccessToken = $AuthResponse.access_token
    Write-Host "✅ Token acquired successfully`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Failed to get access token" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host "2. Sending POST request to $ApiUrl..."

$Payload = @{
    title = "Senior Frontend Developer"
    company = "Test Company"
    location = "Remote"
    description = "Test description"
    url = "https://www.linkedin.com/jobs/view/test-123"
    source = "linkedin"
    status = "saved"
} | ConvertTo-Json

$ApiHeaders = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

try {
    $Response1 = Invoke-RestMethod -Method Post -Uri $ApiUrl -Headers $ApiHeaders -Body $Payload
    if ($Response1.success -eq $true) {
        Write-Host "✅ First request successful!" -ForegroundColor Green
        Write-Host "Job ID: $($Response1.job_id)`n"
        $JobId1 = $Response1.job_id
    } else {
        Write-Host "❌ First request returned success: false" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ First request failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host "3. Sending duplicate POST request to test deduplication..."

try {
    $Response2 = Invoke-RestMethod -Method Post -Uri $ApiUrl -Headers $ApiHeaders -Body $Payload
    if ($Response2.success -eq $true) {
        Write-Host "✅ Second request successful!" -ForegroundColor Green
        $JobId2 = $Response2.job_id

        if ($JobId1 -eq $JobId2) {
            Write-Host "✅ Deduplication worked (Job ID is the same: $JobId2)`n" -ForegroundColor Green
        } else {
            Write-Host "❌ Deduplication failed (Different Job IDs)" -ForegroundColor Red
            Write-Host "First: $JobId1"
            Write-Host "Second: $JobId2"
            exit 1
        }
    } else {
        Write-Host "❌ Second request returned success: false" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Second request failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host "🎉 All tests passed successfully!" -ForegroundColor Cyan
