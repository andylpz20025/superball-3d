@echo off
echo Starte einfachen Python Webserver auf http://localhost:8000
echo Zum Beenden das Fenster schliessen oder STRG+C druecken.
python -m http.server 8000
pause