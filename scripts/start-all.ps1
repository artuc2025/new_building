$ports = @(5432, 6379, 4222, 8222, 6222, 7700, 9000, 9001, 3000, 3001, 3006)
Write-Host "1. Killing processes on ports: $ports"
foreach ($port in $ports) {
    if (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) {
        $procs = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($procs) {
            foreach ($p in $procs) { 
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "   - Killed process $p on port $port"
            }
        }
    }
}

Write-Host "`n2. Checking Docker..."
$dockerReady = $false
$retries = 0
while (-not $dockerReady -and $retries -lt 30) {
    try {
        docker version > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerReady = $true
            Write-Host "   Docker is ready."
        } else {
            throw "Docker not ready"
        }
    } catch {
        Write-Host "   Waiting for Docker... ($retries/30)"
        if ($retries -eq 0) {
             Write-Host "   Attempting to start Docker Desktop..."
             Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        $retries++
    }
}

if (-not $dockerReady) {
    Write-Host "ERROR: Docker did not start. Please start Docker Desktop manually." -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Starting Docker Compose services..."
docker-compose up -d

Write-Host "   Waiting for Postgres to be ready on port 5432..."
$postgresReady = $false
$pgRetries = 0
while (-not $postgresReady -and $pgRetries -lt 30) {
    if (Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet) {
        $postgresReady = $true
        Write-Host "   Postgres is listening."
    } else {
        Write-Host "   Waiting for Postgres... ($pgRetries/30)"
        Start-Sleep -Seconds 2
        $pgRetries++
    }
}

Write-Host "`n4. Starting Nx Apps (Frontend, API Gateway, Listings Service)..."
# Using Start-Process to run in same window if possible or just execute
npx nx run-many --target=serve --projects=api-gateway,listings-service,search-service,media-service,content-service,analytics-service,frontend --parallel=10
