@echo off
set args=%*
echo %args% | findstr /C:"rev-parse HEAD" >nul && (
  echo 68415ad1d920f6fe5ec284f5c2febf7c4dd5b0b3
  exit /b 0
)
echo %args% | findstr /C:"log -n 1" >nul && (
  echo 1 year ago
  exit /b 0
)
echo %args% | findstr /C:"--abbrev-ref" >nul && (
  echo stable
  exit /b 0
)
echo %args% | findstr /C:"remote get-url" >nul && (
  echo https://github.com/flutter/flutter.git
  exit /b 0
)
echo %args% | findstr /C:"describe" >nul && (
  echo 3.27.3-0-g68415ad1d9
  exit /b 0
)
exit /b 0
