@echo off
setlocal EnableExtensions
rem ============================================================================
rem  SPACE CATS: generates the planet aliens with sprite-forge (local, offline).
rem
rem  1. Open ComfyUI first (it must be running on http://127.0.0.1:8188).
rem  2. Double-click this file, or run it from the space-cats folder:
rem        tools\generate-aliens.bat
rem
rem  30 aliens (3 per planet), about 1-3 minutes each. Aliens that already exist
rem  are skipped, so you can stop it (Ctrl+C) and run it again later to continue.
rem  Until an alien is generated, the game shows a recolored copy of the
rem  original walker / hopper / flyer.
rem
rem  Options:  tools\generate-aliens.bat tux   also regenerates the Tux cat
rem                                              with a clear helmet
rem  Set SPRITE_FORGE to use a sprite-forge.bat somewhere else.
rem ============================================================================

set "FORGE=C:\Programming\AI LAB\Comfy AI\sprite-forge\sprite-forge.bat"
if not "%SPRITE_FORGE%"=="" set "FORGE=%SPRITE_FORGE%"
set "OUT=%~dp0..\frontend\public\sprites"
set /a DONE=0
set /a SKIPPED=0
set /a FAILED=0

if not exist "%FORGE%" (
  echo Can't find sprite-forge at:
  echo   %FORGE%
  echo Set SPRITE_FORGE to the full path of sprite-forge.bat and run this again.
  exit /b 1
)

curl -s -o nul http://127.0.0.1:8188/system_stats
if errorlevel 1 (
  echo ComfyUI is not running. Start ComfyUI, wait until it has loaded, then run this again.
  exit /b 1
)

call :make luna_walker "a small round grey moon mite alien with crater spots on its body, one big yellow eye and two stubby legs"
call :make luna_hopper "a pale blue alien frog with big springy legs and a tiny antenna on its head"
call :make luna_flyer "a fuzzy white moth alien with silver dusty wings and glowing blue eyes"
call :make mars_walker "a rusty red beetle alien with a hard shell, walking upright on two legs"
call :make mars_hopper "an orange desert kangaroo alien with long ears and a striped tail"
call :make mars_flyer "a floating red flame spirit alien with tiny bat wings and white eyes"
call :make frost_walker "a chubby ice blue slime alien with frost crystals on its head and two short legs"
call :make frost_hopper "a fluffy white snow yeti alien with big feet and a blue face"
call :make frost_flyer "a small ice bird alien with glassy light blue crystal wings"
call :make verdania_walker "a green mushroom alien with a pink spotted cap, a little face and two short legs"
call :make verdania_hopper "a lime green grasshopper alien with leafy arms and big red eyes, standing upright"
call :make verdania_flyer "a purple bat alien with pink flower petal wings"
call :make asteroid_walker "a brown rock crab alien made of stone with two big claws, walking upright"
call :make asteroid_hopper "a small alien with a glowing orange meteor rock for a body and springy legs"
call :make asteroid_flyer "a blue fly alien with a glowing comet tail and clear wings"
call :make station_walker "a boxy grey security robot with a red visor and short metal legs"
call :make station_hopper "a small round yellow robot with a big spring for legs and one blue eye"
call :make station_flyer "a white hover drone robot with two small propellers and a camera eye"
call :make magmara_walker "a dark lava slug alien with glowing orange cracks, standing upright"
call :make magmara_hopper "a small red fire imp alien with tiny horns and flaming orange hair"
call :make magmara_flyer "an orange moth alien with fiery yellow and red wings"
call :make nimbus_walker "a soft pink cloud alien with a sleepy face and two tiny feet"
call :make nimbus_hopper "a dark grey storm cloud alien with a yellow lightning bolt tail and springy legs"
call :make nimbus_flyer "a lavender manta ray alien with wide wings and a long thin tail"
call :make prisma_walker "a stocky golem alien made of shiny cyan crystals"
call :make prisma_hopper "a pink crystal frog alien with prism shaped spikes on its back"
call :make prisma_flyer "a glowing rainbow fairy alien with sparkling crystal wings"
call :make mothership_walker "a purple alien blob soldier with one big eye, a silver helmet and silver armor"
call :make mothership_hopper "a green alien blob trooper with one big eye, a jetpack and a silver helmet"
call :make mothership_flyer "a purple alien blob with one big eye riding a tiny flying saucer"

if /i "%~1"=="tux" (
  echo.
  echo === tuxedocat: regenerating with a clear helmet
  call "%FORGE%" make tuxedocat "a black and white tuxedo cat astronaut in a white space suit with a clear round glass helmet that shows its face" --new-palette --out "%OUT%"
)

echo.
echo ============================================================================
echo  Generated: %DONE%   Already there: %SKIPPED%   Failed: %FAILED%
echo  Restart "npm run dev" (or refresh the page) to see the new aliens.
echo ============================================================================
exit /b 0

:make
if exist "%OUT%\%~1\%~1.json" (
  set /a SKIPPED+=1
  echo [skip] %~1 already exists
  exit /b 0
)
echo.
echo === %~1: %~2
call "%FORGE%" make %~1 "%~2" --out "%OUT%"
if errorlevel 1 (
  set /a FAILED+=1
  echo [failed] %~1, run this script again later to retry it
) else (
  set /a DONE+=1
)
exit /b 0
