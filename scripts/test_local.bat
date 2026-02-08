@echo off
echo ========================================================
echo   SenstoSales Local Verification Suite
echo ========================================================
echo.

echo [1/2] Running Backend Safe Logic Tests (Pytest)...
echo --------------------------------------------------------
cd /d "%~dp0..\backend"
python -m pytest tests/integration/test_core_flow.py -v -s -W ignore::DeprecationWarning
echo.
echo [1.5] Running Historical Bug Regressions...
python -m pytest tests/integration/test_known_bugs.py -v -s -W ignore::DeprecationWarning
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ TESTS FAILED! check output above.
    cd ..
    exit /b 1
)
cd ..

echo.
echo ========================================================
echo ✅ ALL CHECKS PASSED. SYSTEM IS STABLE.
echo ========================================================
exit /b 0
