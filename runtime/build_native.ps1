# Geometry Web — native build + test runner (Windows / MSVC via CMake).
# Builds the C++ runtime and runs the native unit tests.
$ErrorActionPreference = 'Stop'

$cmake = 'C:\Program Files\CMake\bin\cmake.exe'
if (-not (Test-Path -LiteralPath $cmake)) {
    $cmake = (Get-Command cmake -ErrorAction SilentlyContinue).Source
}
if (-not $cmake) { throw 'CMake not found. Install CMake and re-run.' }

$runtimeDir = $PSScriptRoot
$buildDir = Join-Path $runtimeDir 'build'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

& $cmake -S $runtimeDir -B $buildDir -G 'Visual Studio 17 2022' -A x64
& $cmake --build $buildDir --config Release

$testExe = Join-Path $buildDir 'Release\native_test.exe'
if (-not (Test-Path -LiteralPath $testExe)) {
    $testExe = Join-Path $buildDir 'native_test.exe'
}
Write-Host '--- running native_test ---'
& $testExe
exit $LASTEXITCODE
