@echo off
rem Starts the Selenium server (on a VM) with the IE driver enabled
rem Download IEDriverServer.exe and selenium-server-standalone-*.jar and place in c:\
java -Dwebdriver.ie.driver=c:\IEDriverServer.exe -jar c:\selenium-server-standalone-2.37.0.jar
